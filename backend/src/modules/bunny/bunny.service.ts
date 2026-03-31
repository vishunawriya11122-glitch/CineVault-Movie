import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Movie, MovieDocument } from '../../schemas/movie.schema';
import { Season, SeasonDocument, Episode, EpisodeDocument } from '../../schemas/series.schema';

// Bunny Stream library details
const LIBRARY_ID = '628904';
const LIBRARY_API_KEY = 'f4b47df9-f70d-4269-a2be2a035a23-a746-4436';
const CDN_HOSTNAME = 'vz-f3b830f6-306.b-cdn.net';
const STREAM_API = `https://video.bunnycdn.com/library/${LIBRARY_ID}`;
const PARALLEL_CONCURRENCY = 3; // Stream-upload 3 videos simultaneously (download + upload per video)

export interface StreamProgress {
  jobId: string;
  type: 'import' | 'migrate' | 'series-import' | 'bulk-upload';
  label: string;
  total: number;
  uploaded: number;
  transcoding: number;
  completed: number;
  failed: number;
  current: string[];
  running: boolean;
  startedAt: number;
  results: { id: string; title: string; status: string; error?: string; bunnyVideoId?: string }[];
}

export interface BunnyVideo {
  videoLibraryId: number;
  guid: string;
  title: string;
  status: number; // 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error, 6=UploadFailed
  encodeProgress: number;
  availableResolutions: string;
  width: number;
  height: number;
  length: number;
  storageSize: number;
  thumbnailFileName: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface ScannedSeason {
  seasonNumber: number;
  folderName?: string;
  folderId?: string;
  episodes: { fileId: string; fileName: string; episodeNumber: number; title: string }[];
}

@Injectable()
export class BunnyService {
  private readonly logger = new Logger(BunnyService.name);
  private readonly workerUrl = 'https://drive-index.vishunawriya11122.workers.dev';

  // Multi-job progress tracking
  private jobs = new Map<string, StreamProgress>();
  private readonly MAX_JOBS_HISTORY = 20;

  constructor(
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    @InjectModel(Season.name) private seasonModel: Model<SeasonDocument>,
    @InjectModel(Episode.name) private episodeModel: Model<EpisodeDocument>,
  ) {}

  // ─── URL Builders ────────────────────────────────────────────

  hlsUrl(videoId: string): string {
    return `https://${CDN_HOSTNAME}/${videoId}/playlist.m3u8`;
  }

  thumbnailUrl(videoId: string): string {
    return `https://${CDN_HOSTNAME}/${videoId}/thumbnail.jpg`;
  }

  mp4Url(videoId: string, resolution: string): string {
    return `https://${CDN_HOSTNAME}/${videoId}/play_${resolution}.mp4`;
  }

  directPlayUrl(videoId: string): string {
    return `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}`;
  }

  // ─── Bunny Stream API Helpers ────────────────────────────────

  private async streamApi<T = any>(
    path: string,
    method: string = 'GET',
    body?: any,
  ): Promise<T> {
    const url = `${STREAM_API}${path}`;
    const headers: Record<string, string> = {
      AccessKey: LIBRARY_API_KEY,
      accept: 'application/json',
    };
    const opts: RequestInit = { method, headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bunny Stream API ${method} ${path}: ${res.status} ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  // ─── Video CRUD ──────────────────────────────────────────────

  async createVideo(title: string, collectionId?: string): Promise<BunnyVideo> {
    const body: any = { title };
    if (collectionId) body.collectionId = collectionId;
    return this.streamApi<BunnyVideo>('/videos', 'POST', body);
  }

  async fetchVideoFromUrl(title: string, url: string, collectionId?: string): Promise<BunnyVideo> {
    const body: any = { url, title };
    if (collectionId) body.collectionId = collectionId;
    return this.streamApi<BunnyVideo>('/videos/fetch', 'POST', body);
  }

  async getVideoStatus(videoId: string): Promise<BunnyVideo> {
    return this.streamApi<BunnyVideo>(`/videos/${videoId}`);
  }

  async listVideos(page = 1, perPage = 100, search?: string): Promise<{ totalItems: number; items: BunnyVideo[] }> {
    let path = `/videos?page=${page}&itemsPerPage=${perPage}&orderBy=date`;
    if (search) path += `&search=${encodeURIComponent(search)}`;
    return this.streamApi(path);
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.streamApi(`/videos/${videoId}`, 'DELETE');
  }

  async uploadVideoBinary(videoId: string, fileBuffer: Buffer): Promise<void> {
    const url = `${STREAM_API}/videos/${videoId}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        AccessKey: LIBRARY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(fileBuffer),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload binary failed: ${res.status} ${text}`);
    }
  }

  // ─── Stream Download → Upload (fixes Google Drive + Bunny) ──
  //
  // Instead of telling Bunny to fetch from a URL (which fails for Drive
  // because of CF Worker 100MB limits and Drive download confirmation),
  // our backend downloads the file and streams it to Bunny's upload endpoint.
  //
  async downloadAndUploadToBunny(
    title: string,
    sourceUrl: string,
    collectionId?: string,
  ): Promise<BunnyVideo> {
    const video = await this.createVideo(title, collectionId);

    try {
      this.logger.log(`[Stream] Downloading: ${sourceUrl.slice(0, 120)}...`);

      // Try the direct Google Drive download URL first for reliability
      let downloadUrl = sourceUrl;
      const driveFileId = this.extractDriveFileId(sourceUrl);
      if (driveFileId) {
        downloadUrl = `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&confirm=t`;
      }

      const downloadRes = await fetch(downloadUrl, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });

      if (!downloadRes.ok || !downloadRes.body) {
        throw new Error(`Download failed: HTTP ${downloadRes.status}`);
      }

      // Safety check: ensure we got a video, not an HTML confirmation page
      const ct = downloadRes.headers.get('content-type') || '';
      if (ct.includes('text/html')) {
        // Google Drive returned confirmation page — try worker fallback
        this.logger.warn(`[Stream] Drive returned HTML, falling back to worker proxy...`);
        const workerUrl = driveFileId ? `${this.workerUrl}/stream/${driveFileId}` : sourceUrl;
        const fallbackRes = await fetch(workerUrl, {
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        if (!fallbackRes.ok || !fallbackRes.body) {
          throw new Error(`Worker download also failed: HTTP ${fallbackRes.status}`);
        }
        const fbCt = fallbackRes.headers.get('content-type') || '';
        if (fbCt.includes('text/html')) {
          throw new Error('Cannot download file — Google Drive returned HTML page. Ensure file is public.');
        }
        return await this.streamTooBunnyUpload(video.guid, fallbackRes, video);
      }

      return await this.streamTooBunnyUpload(video.guid, downloadRes, video);
    } catch (err) {
      // Clean up the empty video entry on Bunny
      try { await this.deleteVideo(video.guid); } catch {}
      throw err;
    }
  }

  private async streamTooBunnyUpload(
    videoId: string,
    downloadRes: Response,
    video: BunnyVideo,
  ): Promise<BunnyVideo> {
    const uploadUrl = `${STREAM_API}/videos/${videoId}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        AccessKey: LIBRARY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: downloadRes.body as any,
      // @ts-ignore — required for streaming request body in Node.js 18+
      duplex: 'half',
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Bunny upload failed: ${uploadRes.status} ${errText}`);
    }

    this.logger.log(`[Stream] Upload complete → Bunny video ${videoId}`);
    return video;
  }

  // ─── Delete all error/failed videos from Bunny library ──────

  async cleanupFailedVideos(): Promise<{ deleted: number; errors: number }> {
    const allVideos = await this.listVideos(1, 1000);
    const failedVideos = allVideos.items.filter(
      (v) => v.status === 5 || v.status === 6 || (v.status === 0 && v.storageSize === 0 && v.length === 0),
    );

    this.logger.log(`[Cleanup] Found ${failedVideos.length} failed/empty videos to delete`);

    let deleted = 0;
    let errors = 0;
    for (const v of failedVideos) {
      try {
        await this.deleteVideo(v.guid);
        deleted++;
        this.logger.log(`[Cleanup] Deleted ${v.guid} (${v.title})`);
      } catch (err) {
        errors++;
        this.logger.error(`[Cleanup] Failed to delete ${v.guid}: ${err.message}`);
      }
    }

    return { deleted, errors };
  }

  // ─── Collections ─────────────────────────────────────────────

  async createCollection(name: string): Promise<{ guid: string; name: string }> {
    return this.streamApi('/collections', 'POST', { name });
  }

  async listCollections(): Promise<{ totalItems: number; items: { guid: string; name: string; videoCount: number }[] }> {
    return this.streamApi('/collections');
  }

  // ─── Parallel Execution Helper ───────────────────────────────

  private async runParallel<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency: number = PARALLEL_CONCURRENCY,
  ): Promise<{ results: (R | Error)[]; succeeded: number; failed: number }> {
    const results: (R | Error)[] = new Array(items.length);
    let succeeded = 0;
    let failed = 0;
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < items.length) {
        const idx = nextIndex++;
        try {
          results[idx] = await fn(items[idx], idx);
          succeeded++;
        } catch (err) {
          results[idx] = err instanceof Error ? err : new Error(String(err));
          failed++;
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);

    return { results, succeeded, failed };
  }

  // ─── Multi-Job Progress Tracking ─────────────────────────────

  private createJob(type: StreamProgress['type'], label: string, total: number): StreamProgress {
    // Clean up old finished jobs if too many
    if (this.jobs.size >= this.MAX_JOBS_HISTORY) {
      const finished = [...this.jobs.entries()]
        .filter(([, j]) => !j.running)
        .sort((a, b) => a[1].startedAt - b[1].startedAt);
      for (const [key] of finished.slice(0, finished.length - 5)) {
        this.jobs.delete(key);
      }
    }

    const jobId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: StreamProgress = {
      jobId,
      type,
      label,
      total,
      uploaded: 0,
      transcoding: 0,
      completed: 0,
      failed: 0,
      current: [],
      running: true,
      startedAt: Date.now(),
      results: [],
    };
    this.jobs.set(jobId, job);
    return job;
  }

  getProgress(jobId?: string): StreamProgress | StreamProgress[] | null {
    if (jobId) return this.jobs.get(jobId) || null;
    // Return all jobs sorted by most recent
    return [...this.jobs.values()].sort((a, b) => b.startedAt - a.startedAt);
  }

  getActiveJobs(): StreamProgress[] {
    return [...this.jobs.values()].filter((j) => j.running);
  }

  // ─── Movie Upload to Bunny Stream ───────────────────────────

  async uploadMovieFromUrl(movieId: string, sourceUrl?: string): Promise<{ bunnyVideoId: string; hlsUrl: string }> {
    const movie = await this.movieModel.findById(movieId);
    if (!movie) throw new Error('Movie not found');

    let url = sourceUrl;
    if (!url && movie.streamingSources?.length) {
      url = movie.streamingSources[0].url;
    }
    if (!url) throw new Error('No video URL available for this movie');

    url = this.ensureStreamUrl(url);

    this.logger.log(`Uploading movie "${movie.title}" to Bunny Stream from: ${url}`);
    const video = await this.downloadAndUploadToBunny(movie.title, url);

    movie.hlsUrl = this.hlsUrl(video.guid);
    movie.hlsStatus = 'processing';
    movie.streamingSources = [
      { label: 'Auto', url: this.hlsUrl(video.guid), quality: 'auto', priority: 0 } as any,
    ];
    await movie.save();

    this.logger.log(`Movie "${movie.title}" → Bunny video ${video.guid}, transcoding started`);
    return { bunnyVideoId: video.guid, hlsUrl: this.hlsUrl(video.guid) };
  }

  async uploadMovieFromFile(movieId: string, fileBuffer: Buffer, filename: string): Promise<{ bunnyVideoId: string; hlsUrl: string }> {
    const movie = await this.movieModel.findById(movieId);
    if (!movie) throw new Error('Movie not found');

    const video = await this.createVideo(movie.title);
    await this.uploadVideoBinary(video.guid, fileBuffer);

    movie.hlsUrl = this.hlsUrl(video.guid);
    movie.hlsStatus = 'processing';
    movie.streamingSources = [
      { label: 'Auto', url: this.hlsUrl(video.guid), quality: 'auto', priority: 0 } as any,
    ];
    await movie.save();

    this.logger.log(`Movie "${movie.title}" uploaded as ${video.guid}`);
    return { bunnyVideoId: video.guid, hlsUrl: this.hlsUrl(video.guid) };
  }

  async checkMovieTranscoding(movieId: string): Promise<{
    status: number;
    encodeProgress: number;
    hlsStatus: string;
    availableResolutions: string;
  }> {
    const movie = await this.movieModel.findById(movieId);
    if (!movie) throw new Error('Movie not found');
    if (!movie.hlsUrl) throw new Error('Movie has no Bunny Stream video');

    const videoId = this.extractVideoIdFromHls(movie.hlsUrl);
    const video = await this.getVideoStatus(videoId);

    let hlsStatus = movie.hlsStatus;
    if (video.status === 4) {
      hlsStatus = 'completed';
      movie.streamingSources = this.buildStreamingSources(videoId, video.availableResolutions);
    } else if (video.status === 5 || video.status === 6) {
      hlsStatus = 'failed';
    } else if (video.status >= 1 && video.status <= 3) {
      hlsStatus = 'processing';
    }

    if (hlsStatus !== movie.hlsStatus) {
      movie.hlsStatus = hlsStatus;
      await movie.save();
    }

    return {
      status: video.status,
      encodeProgress: video.encodeProgress,
      hlsStatus,
      availableResolutions: video.availableResolutions,
    };
  }

  // ─── Episode Upload to Bunny Stream ──────────────────────────

  async uploadEpisodeFromUrl(
    episodeId: string,
    sourceUrl?: string,
    collectionId?: string,
  ): Promise<{ bunnyVideoId: string; hlsUrl: string }> {
    const episode = await this.episodeModel.findById(episodeId);
    if (!episode) throw new Error('Episode not found');

    let url = sourceUrl;
    if (!url && episode.streamingSources?.length) {
      url = episode.streamingSources[0].url;
    }
    if (!url) throw new Error('No video URL available for this episode');

    url = this.ensureStreamUrl(url);

    const videoTitle = `${episode.title || 'Episode'} ${episode.episodeNumber}`;
    this.logger.log(`Uploading episode "${videoTitle}" to Bunny Stream from: ${url}`);

    const video = await this.downloadAndUploadToBunny(videoTitle, url, collectionId);

    episode.streamingSources = [
      { label: 'Auto (HLS)', url: this.hlsUrl(video.guid), quality: 'auto', priority: 0 } as any,
    ];
    if (!episode.thumbnailUrl) {
      episode.thumbnailUrl = this.thumbnailUrl(video.guid);
    }
    await episode.save();

    return { bunnyVideoId: video.guid, hlsUrl: this.hlsUrl(video.guid) };
  }

  async uploadEpisodeFromFile(
    episodeId: string,
    fileBuffer: Buffer,
    filename: string,
    collectionId?: string,
  ): Promise<{ bunnyVideoId: string; hlsUrl: string }> {
    const episode = await this.episodeModel.findById(episodeId);
    if (!episode) throw new Error('Episode not found');

    const videoTitle = `${episode.title || 'Episode'} ${episode.episodeNumber}`;
    const video = await this.createVideo(videoTitle, collectionId);
    await this.uploadVideoBinary(video.guid, fileBuffer);

    episode.streamingSources = [
      { label: 'Auto (HLS)', url: this.hlsUrl(video.guid), quality: 'auto', priority: 0 } as any,
    ];
    if (!episode.thumbnailUrl) {
      episode.thumbnailUrl = this.thumbnailUrl(video.guid);
    }
    await episode.save();

    return { bunnyVideoId: video.guid, hlsUrl: this.hlsUrl(video.guid) };
  }

  // ─── Season / Folder Import (PARALLEL) ──────────────────────

  async importSeasonFromFolder(
    seasonId: string,
    folderUrl: string,
  ): Promise<{ jobId: string; message: string }> {
    const season = await this.seasonModel.findById(seasonId);
    if (!season) throw new Error('Season not found');

    const folderIdMatch = folderUrl.match(/folders?\/([\w-]+)/);
    if (!folderIdMatch) throw new Error('Invalid Google Drive folder URL');
    const folderId = folderIdMatch[1];

    const listUrl = `${this.workerUrl}/list?id=${folderId}`;
    const listRes = await fetch(listUrl);
    if (!listRes.ok) throw new Error(`Folder scan failed: ${listRes.status}`);
    const files: DriveFile[] = await listRes.json() as any;

    const videoFiles = files.filter(
      (f) => f.mimeType?.startsWith('video/') || /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name),
    );
    videoFiles.sort((a, b) => this.extractEpisodeNumber(a.name) - this.extractEpisodeNumber(b.name));

    if (!videoFiles.length) throw new Error('No video files found in folder');

    const series = await this.movieModel.findById(season.seriesId);
    const collectionName = `${series?.title || 'Series'} - Season ${season.seasonNumber}`;
    let collectionId: string | undefined;
    try {
      const col = await this.createCollection(collectionName);
      collectionId = col.guid;
    } catch (err) {
      this.logger.warn(`Could not create collection: ${err.message}`);
    }

    const job = this.createJob('import', `Season ${season.seasonNumber} Import`, videoFiles.length);

    // Run in background with parallel processing
    this.runFolderImportParallel(job, seasonId, videoFiles, collectionId).catch((err) => {
      this.logger.error(`Folder import crashed: ${err.message}`);
      job.running = false;
    });

    return { jobId: job.jobId, message: `Importing ${videoFiles.length} episodes in parallel (${PARALLEL_CONCURRENCY} at a time)` };
  }

  private async runFolderImportParallel(
    job: StreamProgress,
    seasonId: string,
    videoFiles: DriveFile[],
    collectionId?: string,
  ): Promise<void> {
    const existingEpisodes = await this.episodeModel.find({ seasonId }).sort({ episodeNumber: 1 }).exec();
    const existingNumbers = new Set(existingEpisodes.map((e) => e.episodeNumber));

    await this.runParallel(videoFiles, async (file, index) => {
      const epNum = this.extractEpisodeNumber(file.name) || (index + 1);
      const epTitle = this.cleanEpisodeTitle(file.name, epNum);
      job.current = [...job.current.filter((c) => c !== `Episode ${epNum}`), `Episode ${epNum}`].slice(-PARALLEL_CONCURRENCY);

      try {
        const streamUrl = `${this.workerUrl}/stream/${file.id}`;
        const video = await this.downloadAndUploadToBunny(`${epTitle} - Episode ${epNum}`, streamUrl, collectionId);

        const hlsLink = this.hlsUrl(video.guid);
        const thumb = this.thumbnailUrl(video.guid);

        if (existingNumbers.has(epNum)) {
          await this.episodeModel.findOneAndUpdate(
            { seasonId, episodeNumber: epNum },
            {
              streamingSources: [{ label: 'Auto (HLS)', url: hlsLink, quality: 'auto', priority: 0 }],
              thumbnailUrl: thumb,
            },
          );
        } else {
          await this.episodeModel.create({
            seasonId: new Types.ObjectId(seasonId),
            episodeNumber: epNum,
            title: epTitle,
            streamingSources: [{ label: 'Auto (HLS)', url: hlsLink, quality: 'auto', priority: 0 }],
            thumbnailUrl: thumb,
          });
        }

        job.uploaded++;
        job.transcoding++;
        job.results.push({ id: video.guid, title: `Episode ${epNum}`, status: 'success', bunnyVideoId: video.guid });
        this.logger.log(`Episode ${epNum} → Bunny video ${video.guid}`);
      } catch (err) {
        job.failed++;
        job.results.push({ id: file.id, title: `Episode ${epNum}`, status: 'failed', error: err.message });
        this.logger.error(`Episode ${epNum} failed: ${err.message}`);
      }
    }, PARALLEL_CONCURRENCY);

    // Update season episode count
    const epCount = await this.episodeModel.countDocuments({ seasonId });
    await this.seasonModel.findByIdAndUpdate(seasonId, { episodeCount: epCount });

    job.current = [];
    job.running = false;
    job.completed = job.uploaded;
    this.logger.log(`Folder import complete: ${job.uploaded}/${job.total} succeeded, ${job.failed} failed`);
  }

  // ─── Season Migration (PARALLEL) ────────────────────────────

  async migrateSeasonToBunnyStream(seasonId: string): Promise<{ jobId: string; message: string }> {
    const episodes = await this.episodeModel.find({ seasonId }).sort({ episodeNumber: 1 }).exec();
    if (!episodes.length) throw new Error('No episodes found for this season');

    const season = await this.seasonModel.findById(seasonId);
    const series = season ? await this.movieModel.findById(season.seriesId) : null;
    const collectionName = `${series?.title || 'Series'} - Season ${season?.seasonNumber || '?'}`;

    let collectionId: string | undefined;
    try {
      const col = await this.createCollection(collectionName);
      collectionId = col.guid;
    } catch (err) {
      this.logger.warn(`Could not create collection: ${err.message}`);
    }

    const job = this.createJob('migrate', `Season ${season?.seasonNumber} Migration`, episodes.length);

    this.runSeasonMigrationParallel(job, episodes, collectionId).catch((err) => {
      this.logger.error(`Season migration crashed: ${err.message}`);
      job.running = false;
    });

    return { jobId: job.jobId, message: `Migrating ${episodes.length} episodes in parallel` };
  }

  private async runSeasonMigrationParallel(
    job: StreamProgress,
    episodes: EpisodeDocument[],
    collectionId?: string,
  ): Promise<void> {
    await this.runParallel(episodes, async (episode) => {
      const epLabel = `${episode.title || 'Episode'} ${episode.episodeNumber}`;
      job.current = [...job.current.filter((c) => c !== epLabel), epLabel].slice(-PARALLEL_CONCURRENCY);

      let sourceUrl = episode.streamingSources?.[0]?.url;
      if (!sourceUrl) throw new Error('No source URL');
      sourceUrl = this.ensureStreamUrl(sourceUrl);

      const video = await this.downloadAndUploadToBunny(epLabel, sourceUrl, collectionId);

      episode.streamingSources = [
        { label: 'Auto (HLS)', url: this.hlsUrl(video.guid), quality: 'auto', priority: 0 } as any,
      ];
      if (!episode.thumbnailUrl || episode.thumbnailUrl.includes('drive.google.com')) {
        episode.thumbnailUrl = this.thumbnailUrl(video.guid);
      }
      await episode.save();

      job.uploaded++;
      job.transcoding++;
      job.results.push({ id: episode._id.toString(), title: epLabel, status: 'success', bunnyVideoId: video.guid });
    }, PARALLEL_CONCURRENCY);

    job.current = [];
    job.running = false;
    job.completed = job.uploaded;
  }

  // ═══ FULL SERIES IMPORT PIPELINE ═════════════════════════════
  //
  // ONE link → scan folder → detect seasons → detect episodes
  // → create DB entries → upload ALL to Bunny Stream (parallel)
  // → auto-transcode → ready to stream
  //

  async importFullSeries(
    seriesId: string,
    folderUrl: string,
  ): Promise<{ jobId: string; message: string; seasons: number; episodes: number }> {
    const series = await this.movieModel.findById(seriesId);
    if (!series) throw new Error('Series not found');

    // Step 1: Scan folder structure
    this.logger.log(`[Full Import] Scanning folder for "${series.title}"...`);
    const scannedSeasons = await this.scanDriveFolder(folderUrl);

    const totalEpisodes = scannedSeasons.reduce((sum, s) => sum + s.episodes.length, 0);
    if (totalEpisodes === 0) throw new Error('No video files found in folder');

    const job = this.createJob(
      'series-import',
      `${series.title} — Full Import`,
      totalEpisodes,
    );

    // Step 2: Run full pipeline in background
    this.runFullSeriesImport(job, seriesId, series.title, scannedSeasons).catch((err) => {
      this.logger.error(`Full series import crashed: ${err.message}`);
      job.running = false;
    });

    return {
      jobId: job.jobId,
      message: `Importing ${scannedSeasons.length} season(s) with ${totalEpisodes} episode(s) — parallel upload + auto-transcoding`,
      seasons: scannedSeasons.length,
      episodes: totalEpisodes,
    };
  }

  private async runFullSeriesImport(
    job: StreamProgress,
    seriesId: string,
    seriesTitle: string,
    scannedSeasons: ScannedSeason[],
  ): Promise<void> {
    for (const scanned of scannedSeasons) {
      // Step 2a: Create or find season
      let season = await this.seasonModel.findOne({
        seriesId: new Types.ObjectId(seriesId),
        seasonNumber: scanned.seasonNumber,
      });
      if (!season) {
        season = await this.seasonModel.create({
          seriesId: new Types.ObjectId(seriesId),
          seasonNumber: scanned.seasonNumber,
          title: scanned.folderName || `Season ${scanned.seasonNumber}`,
          episodeCount: 0,
        });
        this.logger.log(`[Full Import] Created Season ${scanned.seasonNumber}`);
      }
      const seasonId = season._id.toString();

      // Step 2b: Create Bunny collection for this season
      const collectionName = `${seriesTitle} - Season ${scanned.seasonNumber}`;
      let collectionId: string | undefined;
      try {
        const col = await this.createCollection(collectionName);
        collectionId = col.guid;
      } catch (err) {
        this.logger.warn(`Could not create collection: ${err.message}`);
      }

      // Step 2c: Get existing episodes
      const existingEpisodes = await this.episodeModel.find({ seasonId: season._id }).exec();
      const existingNumbers = new Set(existingEpisodes.map((e) => e.episodeNumber));

      // Step 2d: Upload all episodes for this season IN PARALLEL
      await this.runParallel(scanned.episodes, async (ep) => {
        const epLabel = `S${scanned.seasonNumber}E${ep.episodeNumber}: ${ep.title}`;
        job.current = [...job.current.filter((c) => c !== epLabel), epLabel].slice(-PARALLEL_CONCURRENCY);

        try {
          const streamUrl = `${this.workerUrl}/stream/${ep.fileId}`;
          const video = await this.downloadAndUploadToBunny(
            `${ep.title} - S${scanned.seasonNumber}E${ep.episodeNumber}`,
            streamUrl,
            collectionId,
          );

          const hlsLink = this.hlsUrl(video.guid);
          const thumb = this.thumbnailUrl(video.guid);

          // Create or update episode in DB
          if (existingNumbers.has(ep.episodeNumber)) {
            await this.episodeModel.findOneAndUpdate(
              { seasonId: season._id, episodeNumber: ep.episodeNumber },
              {
                title: ep.title,
                streamingSources: [{ label: 'Auto (HLS)', url: hlsLink, quality: 'auto', priority: 0 }],
                thumbnailUrl: thumb,
              },
            );
          } else {
            await this.episodeModel.create({
              seasonId: season._id,
              episodeNumber: ep.episodeNumber,
              title: ep.title,
              streamingSources: [{ label: 'Auto (HLS)', url: hlsLink, quality: 'auto', priority: 0 }],
              thumbnailUrl: thumb,
            });
          }

          job.uploaded++;
          job.transcoding++;
          job.results.push({ id: video.guid, title: epLabel, status: 'success', bunnyVideoId: video.guid });
          this.logger.log(`${epLabel} → Bunny video ${video.guid}`);
        } catch (err) {
          job.failed++;
          job.results.push({ id: ep.fileId, title: epLabel, status: 'failed', error: err.message });
          this.logger.error(`${epLabel} failed: ${err.message}`);
        }
      }, PARALLEL_CONCURRENCY);

      // Update season episode count
      const epCount = await this.episodeModel.countDocuments({ seasonId: season._id });
      await this.seasonModel.findByIdAndUpdate(seasonId, { episodeCount: epCount });
    }

    job.current = [];
    job.running = false;
    job.completed = job.uploaded;
    this.logger.log(`[Full Import] Complete: ${job.uploaded}/${job.total} episodes, ${job.failed} failed`);
  }

  // ─── Drive Folder Scanner ───────────────────────────────────

  private async scanDriveFolder(folderUrl: string): Promise<ScannedSeason[]> {
    const folderIdMatch = folderUrl.match(/folders?\/([\w-]+)/);
    if (!folderIdMatch) throw new Error('Invalid Google Drive folder URL');
    const folderId = folderIdMatch[1];

    const topLevel = await this.listDriveFolder(folderId);
    const folders = topLevel.filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
    const videos = topLevel.filter((f) => this.isVideoFile(f));

    const seasons: ScannedSeason[] = [];

    // Subfolders → each is a separate season
    if (folders.length > 0) {
      const sorted = [...folders].sort((a, b) => {
        const na = this.extractSeasonNumber(a.name);
        const nb = this.extractSeasonNumber(b.name);
        return na - nb || a.name.localeCompare(b.name);
      });

      // Scan all season folders in parallel
      const folderResults = await this.runParallel(sorted, async (folder, idx) => {
        const seasonNum = this.extractSeasonNumber(folder.name) || (idx + 1);
        const subFiles = await this.listDriveFolder(folder.id);
        const subVideos = subFiles.filter((f) => this.isVideoFile(f));
        if (subVideos.length === 0) return null;

        subVideos.sort((a, b) => this.extractEpisodeNumber(a.name) - this.extractEpisodeNumber(b.name));

        return {
          seasonNumber: seasonNum,
          folderName: folder.name,
          folderId: folder.id,
          episodes: subVideos.map((v, i) => {
            const epNum = this.extractEpisodeNumber(v.name) || (i + 1);
            return {
              fileId: v.id,
              fileName: v.name,
              episodeNumber: epNum,
              title: this.cleanEpisodeTitle(v.name, epNum),
            };
          }),
        } as ScannedSeason;
      }, 5);

      for (const r of folderResults.results) {
        if (r && !(r instanceof Error)) seasons.push(r);
      }
    }

    // Root-level videos → Season 1
    if (videos.length > 0) {
      videos.sort((a, b) => this.extractEpisodeNumber(a.name) - this.extractEpisodeNumber(b.name));
      const seasonNum = seasons.length > 0 ? Math.max(...seasons.map((s) => s.seasonNumber)) + 1 : 1;
      seasons.push({
        seasonNumber: seasonNum,
        episodes: videos.map((v, i) => {
          const epNum = this.extractEpisodeNumber(v.name) || (i + 1);
          return {
            fileId: v.id,
            fileName: v.name,
            episodeNumber: epNum,
            title: this.cleanEpisodeTitle(v.name, epNum),
          };
        }),
      });
    }

    seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
    return seasons;
  }

  private async listDriveFolder(folderId: string): Promise<DriveFile[]> {
    const listUrl = `${this.workerUrl}/list?id=${folderId}`;
    const res = await fetch(listUrl);
    if (!res.ok) throw new Error(`Folder scan failed: ${res.status}`);
    return await res.json() as DriveFile[];
  }

  // ═══ BUNNY WEBHOOK — AUTO-COMPLETION ═════════════════════════

  async handleWebhook(body: { VideoId: string; Status: number; VideoLibraryId: number }): Promise<{ handled: boolean }> {
    const { VideoId: videoId, Status: status } = body;
    if (!videoId) return { handled: false };

    this.logger.log(`[Webhook] Video ${videoId} status: ${status}`);

    const hlsUrl = this.hlsUrl(videoId);

    // Check if it's a movie
    const movie = await this.movieModel.findOne({ hlsUrl });
    if (movie) {
      if (status === 4) {
        movie.hlsStatus = 'completed';
        movie.streamingSources = this.buildStreamingSources(videoId, '');
        // Fetch actual resolutions
        try {
          const video = await this.getVideoStatus(videoId);
          movie.streamingSources = this.buildStreamingSources(videoId, video.availableResolutions);
        } catch {}
        await movie.save();
        this.logger.log(`[Webhook] Movie "${movie.title}" transcoding completed!`);
      } else if (status === 5 || status === 6) {
        movie.hlsStatus = 'failed';
        await movie.save();
        this.logger.log(`[Webhook] Movie "${movie.title}" transcoding FAILED`);
      }
      return { handled: true };
    }

    // Check if it's an episode
    const episode = await this.episodeModel.findOne({
      'streamingSources.url': hlsUrl,
    });
    if (episode) {
      if (status === 4) {
        try {
          const video = await this.getVideoStatus(videoId);
          episode.streamingSources = this.buildStreamingSources(videoId, video.availableResolutions) as any;
        } catch {
          episode.streamingSources = this.buildStreamingSources(videoId, '') as any;
        }
        await episode.save();
        this.logger.log(`[Webhook] Episode "${episode.title}" transcoding completed!`);
      }
      return { handled: true };
    }

    this.logger.warn(`[Webhook] Video ${videoId} not found in DB`);
    return { handled: false };
  }

  // ─── Bulk Upload Multiple Episodes ───────────────────────────

  async bulkUploadEpisodes(
    seasonId: string,
    episodes: { episodeId: string; url: string }[],
  ): Promise<{ jobId: string; message: string }> {
    const season = await this.seasonModel.findById(seasonId);
    if (!season) throw new Error('Season not found');

    const series = await this.movieModel.findById(season.seriesId);
    const collectionName = `${series?.title || 'Series'} - Season ${season.seasonNumber}`;
    let collectionId: string | undefined;
    try {
      const col = await this.createCollection(collectionName);
      collectionId = col.guid;
    } catch {}

    const job = this.createJob('bulk-upload', `Season ${season.seasonNumber} Bulk Upload`, episodes.length);

    this.runBulkUpload(job, episodes, collectionId).catch((err) => {
      this.logger.error(`Bulk upload crashed: ${err.message}`);
      job.running = false;
    });

    return { jobId: job.jobId, message: `Uploading ${episodes.length} episodes in parallel` };
  }

  private async runBulkUpload(
    job: StreamProgress,
    episodes: { episodeId: string; url: string }[],
    collectionId?: string,
  ): Promise<void> {
    await this.runParallel(episodes, async ({ episodeId, url }) => {
      const episode = await this.episodeModel.findById(episodeId);
      if (!episode) throw new Error(`Episode ${episodeId} not found`);

      const epLabel = `${episode.title || 'Episode'} ${episode.episodeNumber}`;
      job.current = [...job.current.filter((c) => c !== epLabel), epLabel].slice(-PARALLEL_CONCURRENCY);

      const streamUrl = this.ensureStreamUrl(url);
      const video = await this.downloadAndUploadToBunny(epLabel, streamUrl, collectionId);

      episode.streamingSources = [
        { label: 'Auto (HLS)', url: this.hlsUrl(video.guid), quality: 'auto', priority: 0 } as any,
      ];
      if (!episode.thumbnailUrl) {
        episode.thumbnailUrl = this.thumbnailUrl(video.guid);
      }
      await episode.save();

      job.uploaded++;
      job.transcoding++;
      job.results.push({ id: video.guid, title: epLabel, status: 'success', bunnyVideoId: video.guid });
    }, PARALLEL_CONCURRENCY);

    job.current = [];
    job.running = false;
    job.completed = job.uploaded;
  }

  // ─── Season Transcoding Status ──────────────────────────────

  async checkSeasonTranscoding(seasonId: string): Promise<{
    total: number;
    finished: number;
    processing: number;
    failed: number;
    episodes: { episodeNumber: number; status: number; encodeProgress: number; resolutions: string }[];
  }> {
    const episodes = await this.episodeModel.find({ seasonId }).sort({ episodeNumber: 1 }).exec();
    let finished = 0;
    let processing = 0;
    let failed = 0;
    const episodeStatuses: { episodeNumber: number; status: number; encodeProgress: number; resolutions: string }[] = [];

    // Check statuses in parallel too
    await this.runParallel(episodes, async (ep) => {
      const hlsSource = ep.streamingSources?.find((s) => s.url?.includes('playlist.m3u8'));
      if (!hlsSource) {
        episodeStatuses.push({ episodeNumber: ep.episodeNumber, status: -1, encodeProgress: 0, resolutions: '' });
        return;
      }

      const videoId = this.extractVideoIdFromHls(hlsSource.url);
      try {
        const video = await this.getVideoStatus(videoId);
        episodeStatuses.push({
          episodeNumber: ep.episodeNumber,
          status: video.status,
          encodeProgress: video.encodeProgress,
          resolutions: video.availableResolutions,
        });

        if (video.status === 4) {
          finished++;
          ep.streamingSources = this.buildStreamingSources(videoId, video.availableResolutions);
          await ep.save();
        } else if (video.status === 5 || video.status === 6) {
          failed++;
        } else {
          processing++;
        }
      } catch {
        episodeStatuses.push({ episodeNumber: ep.episodeNumber, status: -1, encodeProgress: 0, resolutions: '' });
        failed++;
      }
    }, 10); // Higher concurrency for status checks

    episodeStatuses.sort((a, b) => a.episodeNumber - b.episodeNumber);
    return { total: episodes.length, finished, processing, failed, episodes: episodeStatuses };
  }

  async getLibraryStatus(): Promise<{ totalVideos: number; videos: BunnyVideo[] }> {
    const data = await this.listVideos(1, 100);
    return { totalVideos: data.totalItems, videos: data.items };
  }

  // ─── Utility Methods ─────────────────────────────────────────

  buildStreamingSources(videoId: string, availableResolutions: string): any[] {
    const sources: any[] = [
      { label: 'Auto (HLS)', url: this.hlsUrl(videoId), quality: 'auto', priority: 0 },
    ];
    if (availableResolutions) {
      const resolutions = availableResolutions.split(',').map((r) => r.trim()).filter(Boolean);
      const resPriority: Record<string, number> = { '1080p': 1, '720p': 2, '480p': 3, '360p': 4, '240p': 5 };
      resolutions.sort((a, b) => (resPriority[a] || 99) - (resPriority[b] || 99));
      for (const res of resolutions) {
        sources.push({
          label: res,
          url: this.mp4Url(videoId, res.replace('p', '')),
          quality: res,
          priority: resPriority[res] || 99,
        });
      }
    }
    return sources;
  }

  private extractVideoIdFromHls(hlsUrl: string): string {
    const match = hlsUrl.match(/\/([a-f0-9-]+)\/playlist\.m3u8/);
    if (!match) throw new Error(`Cannot extract video ID from: ${hlsUrl}`);
    return match[1];
  }

  private ensureStreamUrl(url: string): string {
    if (!url.includes('drive.google.com') && !url.includes('drive.usercontent.google.com')) {
      return url;
    }
    const fileId = this.extractDriveFileId(url);
    if (fileId) {
      return `${this.workerUrl}/stream/${fileId}`;
    }
    return url;
  }

  private extractDriveFileId(url: string): string | null {
    if (!url) return null;
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
      /drive\.usercontent\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/,
      /\/stream\/([a-zA-Z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private isVideoFile(file: DriveFile): boolean {
    return file.mimeType?.startsWith('video/') || /\.(mp4|mkv|avi|webm|mov|ts|m4v|flv|wmv)$/i.test(file.name);
  }

  private extractSeasonNumber(name: string): number {
    const match = name.match(/(?:season|s)[\s._-]*(\d+)/i) || name.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractEpisodeNumber(filename: string): number {
    const match = filename.match(/(?:ep|episode|e)[\s._-]*(\d+)/i) || filename.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private cleanEpisodeTitle(filename: string, epNum: number): string {
    let name = filename.replace(/\.[^.]+$/, '');
    name = name.replace(/^(EP|Episode|E)[\s._-]*\d+[\s._-]*/i, '');
    name = name.replace(/[._]/g, ' ').trim();
    return name || `Episode ${epNum}`;
  }
}
