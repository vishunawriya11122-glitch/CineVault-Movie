import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Movie, MovieDocument } from '../../schemas/movie.schema';
import { Episode, EpisodeDocument } from '../../schemas/series.schema';

export interface MigrationProgress {
  total: number;
  completed: number;
  failed: number;
  current: string | null;
  running: boolean;
  results: { id: string; title: string; status: string; error?: string }[];
}

@Injectable()
export class BunnyService {
  private readonly logger = new Logger(BunnyService.name);

  private readonly storageHost = 'sg.storage.bunnycdn.com';
  private readonly zoneName = 'cinevault-videos';
  private readonly storageKey: string;
  private readonly cdnUrl = 'https://cinevault-cdn.b-cdn.net';
  private readonly workerUrl: string;

  private progress: MigrationProgress = {
    total: 0,
    completed: 0,
    failed: 0,
    current: null,
    running: false,
    results: [],
  };

  constructor(
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    @InjectModel(Episode.name) private episodeModel: Model<EpisodeDocument>,
    private configService: ConfigService,
  ) {
    this.storageKey = this.configService.get<string>(
      'BUNNY_STORAGE_KEY',
      '6de9d73d-8d36-43f7-869d393f1d6a-9285-48ab',
    );
    this.workerUrl = this.configService.get<string>(
      'DRIVE_WORKER_URL',
      'https://drive-index.vishunawriya11122.workers.dev',
    );
  }

  getStatus(): MigrationProgress {
    return { ...this.progress };
  }

  /** Extract Google Drive file ID from any URL format */
  private extractDriveFileId(url: string): string | null {
    if (!url) return null;
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
      /drive\.usercontent\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/,
      /docs\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
      // Worker stream URLs: /stream/FILE_ID
      /\/stream\/([a-zA-Z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /** Check if a URL is a Google Drive or Worker URL */
  private isDriveUrl(url: string): boolean {
    if (!url) return false;
    return (
      url.includes('drive.google.com') ||
      url.includes('drive.usercontent.google.com') ||
      url.includes('docs.google.com/uc') ||
      url.includes('workers.dev/stream/')
    );
  }

  /** Check if a URL is a Bunny CDN URL */
  private isBunnyUrl(url: string): boolean {
    return url?.includes('b-cdn.net') || url?.includes('bunnycdn.com') || false;
  }

  /** Upload a file from a source URL to Bunny Storage, streaming directly */
  async uploadFromUrl(
    sourceUrl: string,
    destPath: string,
  ): Promise<string> {
    // Download from source (stream)
    const downloadRes = await fetch(sourceUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });

    if (!downloadRes.ok) {
      throw new Error(
        `Download failed: ${downloadRes.status} ${downloadRes.statusText}`,
      );
    }

    // Validate: check content-type is video, not HTML
    const contentType = downloadRes.headers.get('content-type') || '';
    if (contentType.includes('text/html') || contentType.includes('text/plain')) {
      // Read a small chunk to confirm it's a quota/error page
      const body = await downloadRes.text();
      if (body.includes('Quota exceeded') || body.includes('download_warning') || body.includes('Google Drive')) {
        throw new Error('Google Drive quota exceeded — file not downloadable right now');
      }
      throw new Error(`Source returned non-video content: ${contentType}`);
    }

    const contentLength = downloadRes.headers.get('content-length');
    const sizeBytes = contentLength ? Number(contentLength) : 0;

    // Validate: video files should be at least 100KB
    if (sizeBytes > 0 && sizeBytes < 102400) {
      const body = await downloadRes.text();
      if (body.includes('Quota exceeded') || body.includes('Google Drive') || body.includes('<!DOCTYPE')) {
        throw new Error('Google Drive quota exceeded — received HTML error page instead of video');
      }
      throw new Error(`File too small (${sizeBytes} bytes) — likely not a valid video`);
    }

    this.logger.log(
      `Downloading: ${sourceUrl.substring(0, 80)}... (${contentLength ? Math.round(sizeBytes / 1024 / 1024) + 'MB' : 'unknown size'})`,
    );

    // Upload to Bunny Storage
    const uploadUrl = `https://${this.storageHost}/${this.zoneName}/${destPath}`;
    const uploadHeaders: Record<string, string> = {
      AccessKey: this.storageKey,
      'Content-Type': 'application/octet-stream',
    };
    if (contentLength) {
      uploadHeaders['Content-Length'] = contentLength;
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: uploadHeaders,
      body: downloadRes.body,
      // @ts-ignore - duplex needed for streaming body
      duplex: 'half',
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(
        `Upload failed: ${uploadRes.status} ${uploadRes.statusText} - ${errorText}`,
      );
    }

    const cdnPath = `${this.cdnUrl}/${destPath}`;
    this.logger.log(`Uploaded to Bunny: ${cdnPath}`);
    return cdnPath;
  }

  /** Migrate a single movie's streaming sources + trailer to Bunny */
  async migrateMovie(movieId: string): Promise<{ migrated: number; errors: string[] }> {
    const movie = await this.movieModel.findById(movieId);
    if (!movie) throw new Error(`Movie not found: ${movieId}`);

    let migrated = 0;
    const errors: string[] = [];

    // Migrate streaming sources
    if (movie.streamingSources?.length) {
      for (let i = 0; i < movie.streamingSources.length; i++) {
        const src = movie.streamingSources[i];
        if (!this.isDriveUrl(src.url)) continue;
        const fileId = this.extractDriveFileId(src.url);
        if (!fileId) continue;

        try {
          const workerStreamUrl = `${this.workerUrl}/stream/${fileId}`;
          const ext = 'mp4';
          const destPath = `movies/${movieId}/source_${i}.${ext}`;
          const cdnUrl = await this.uploadFromUrl(workerStreamUrl, destPath);
          movie.streamingSources[i].url = cdnUrl;
          migrated++;
        } catch (err) {
          const msg = `Movie ${movie.title} source[${i}]: ${err.message}`;
          this.logger.error(msg);
          errors.push(msg);
        }
      }
    }

    // Migrate trailer
    if (movie.trailerUrl && this.isDriveUrl(movie.trailerUrl)) {
      const fileId = this.extractDriveFileId(movie.trailerUrl);
      if (fileId) {
        try {
          const workerStreamUrl = `${this.workerUrl}/stream/${fileId}`;
          const destPath = `movies/${movieId}/trailer.mp4`;
          const cdnUrl = await this.uploadFromUrl(workerStreamUrl, destPath);
          movie.trailerUrl = cdnUrl;
          migrated++;
        } catch (err) {
          const msg = `Movie ${movie.title} trailer: ${err.message}`;
          this.logger.error(msg);
          errors.push(msg);
        }
      }
    }

    if (migrated > 0) {
      await movie.save();
    }

    return { migrated, errors };
  }

  /** Migrate a single episode's streaming sources to Bunny */
  async migrateEpisode(
    episodeId: string,
    seriesTitle: string,
  ): Promise<{ migrated: number; errors: string[] }> {
    const episode = await this.episodeModel.findById(episodeId);
    if (!episode) throw new Error(`Episode not found: ${episodeId}`);

    let migrated = 0;
    const errors: string[] = [];

    if (episode.streamingSources?.length) {
      for (let i = 0; i < episode.streamingSources.length; i++) {
        const src = episode.streamingSources[i];
        if (!this.isDriveUrl(src.url)) continue;
        const fileId = this.extractDriveFileId(src.url);
        if (!fileId) continue;

        try {
          const workerStreamUrl = `${this.workerUrl}/stream/${fileId}`;
          const ext = src.url.includes('.mkv') ? 'mkv' : 'mp4';
          const destPath = `episodes/${episode.seasonId}/${episodeId}/source_${i}.${ext}`;
          const cdnUrl = await this.uploadFromUrl(workerStreamUrl, destPath);
          episode.streamingSources[i].url = cdnUrl;
          migrated++;
        } catch (err) {
          const msg = `${seriesTitle} E${episode.episodeNumber} source[${i}]: ${err.message}`;
          this.logger.error(msg);
          errors.push(msg);
        }
      }
    }

    if (migrated > 0) {
      await episode.save();
    }

    return { migrated, errors };
  }

  /** Get all content that still has Drive URLs (not yet migrated) */
  async getPendingContent(): Promise<{
    movies: { id: string; title: string; type: string; driveUrls: number }[];
    episodes: { id: string; title: string; seasonId: string; driveUrls: number }[];
    totalDriveUrls: number;
  }> {
    const allMovies = await this.movieModel.find().lean();
    const allEpisodes = await this.episodeModel.find().lean();

    const movies = [];
    const episodes = [];
    let totalDriveUrls = 0;

    for (const m of allMovies) {
      let driveUrls = 0;
      if (m.streamingSources) {
        driveUrls += m.streamingSources.filter((s) => this.isDriveUrl(s.url)).length;
      }
      if (m.trailerUrl && this.isDriveUrl(m.trailerUrl)) driveUrls++;
      if (driveUrls > 0) {
        movies.push({
          id: m._id.toString(),
          title: m.title,
          type: m.contentType,
          driveUrls,
        });
        totalDriveUrls += driveUrls;
      }
    }

    for (const ep of allEpisodes) {
      let driveUrls = 0;
      if (ep.streamingSources) {
        driveUrls += ep.streamingSources.filter((s) => this.isDriveUrl(s.url)).length;
      }
      if (driveUrls > 0) {
        episodes.push({
          id: ep._id.toString(),
          title: ep.title,
          seasonId: ep.seasonId.toString(),
          driveUrls,
        });
        totalDriveUrls += driveUrls;
      }
    }

    return { movies, episodes, totalDriveUrls };
  }

  /** Migrate ALL Drive content to Bunny (runs in background) */
  async migrateAll(): Promise<void> {
    if (this.progress.running) {
      throw new Error('Migration already in progress');
    }

    const pending = await this.getPendingContent();
    this.progress = {
      total: pending.movies.length + pending.episodes.length,
      completed: 0,
      failed: 0,
      current: null,
      running: true,
      results: [],
    };

    // Run in background (don't await)
    this.runMigration(pending).catch((err) => {
      this.logger.error(`Migration crashed: ${err.message}`);
      this.progress.running = false;
    });
  }

  private async runMigration(pending: Awaited<ReturnType<typeof this.getPendingContent>>): Promise<void> {
    // Migrate movies first
    for (const m of pending.movies) {
      this.progress.current = `Movie: ${m.title}`;
      try {
        const result = await this.migrateMovie(m.id);
        this.progress.completed++;
        this.progress.results.push({
          id: m.id,
          title: m.title,
          status: result.errors.length ? 'partial' : 'success',
          error: result.errors.join('; '),
        });
        if (result.errors.length) this.progress.failed++;
      } catch (err) {
        this.progress.completed++;
        this.progress.failed++;
        this.progress.results.push({
          id: m.id,
          title: m.title,
          status: 'failed',
          error: err.message,
        });
      }
    }

    // Migrate episodes
    for (const ep of pending.episodes) {
      this.progress.current = `Episode: ${ep.title}`;
      try {
        const result = await this.migrateEpisode(ep.id, ep.title);
        this.progress.completed++;
        this.progress.results.push({
          id: ep.id,
          title: ep.title,
          status: result.errors.length ? 'partial' : 'success',
          error: result.errors.join('; '),
        });
        if (result.errors.length) this.progress.failed++;
      } catch (err) {
        this.progress.completed++;
        this.progress.failed++;
        this.progress.results.push({
          id: ep.id,
          title: ep.title,
          status: 'failed',
          error: err.message,
        });
      }
    }

    this.progress.current = null;
    this.progress.running = false;
    this.logger.log(
      `Migration complete: ${this.progress.completed}/${this.progress.total} (${this.progress.failed} failed)`,
    );
  }

  /** Validate a single CDN URL — returns true if file is a valid video (>100KB) */
  private async validateCdnFile(url: string): Promise<{ valid: boolean; size: number }> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const size = Number(res.headers.get('content-length') || 0);
      return { valid: size > 102400, size };
    } catch {
      return { valid: false, size: 0 };
    }
  }

  /** Delete a file from Bunny Storage */
  private async deleteBunnyFile(cdnUrl: string): Promise<boolean> {
    try {
      // CDN URL: https://cinevault-cdn.b-cdn.net/movies/xxx/source_0.mp4
      // Storage path: movies/xxx/source_0.mp4
      const path = cdnUrl.replace(this.cdnUrl + '/', '');
      const deleteUrl = `https://${this.storageHost}/${this.zoneName}/${path}`;
      const res = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { AccessKey: this.storageKey },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Revert all bad Bunny CDN migrations:
   * 1. Find all movies/episodes with CDN URLs
   * 2. HEAD-check each CDN file
   * 3. If file is <100KB (HTML garbage), remove the streaming source entry
   * 4. Delete the bad file from Bunny Storage
   */
  async revertBadMigrations(): Promise<{
    moviesReverted: { id: string; title: string; sourcesRemoved: number }[];
    episodesReverted: { id: string; title: string; sourcesRemoved: number }[];
    bunnyFilesDeleted: number;
    errors: string[];
  }> {
    const moviesReverted: { id: string; title: string; sourcesRemoved: number }[] = [];
    const episodesReverted: { id: string; title: string; sourcesRemoved: number }[] = [];
    let bunnyFilesDeleted = 0;
    const errors: string[] = [];

    // --- Movies ---
    const allMovies = await this.movieModel.find().exec();
    for (const movie of allMovies) {
      let sourcesRemoved = 0;

      if (movie.streamingSources?.length) {
        const validSources = [];
        for (const src of movie.streamingSources) {
          if (this.isBunnyUrl(src.url)) {
            const { valid, size } = await this.validateCdnFile(src.url);
            if (!valid) {
              this.logger.warn(`Bad CDN file: ${movie.title} — ${src.url} (${size} bytes)`);
              const deleted = await this.deleteBunnyFile(src.url);
              if (deleted) bunnyFilesDeleted++;
              sourcesRemoved++;
              continue; // Skip this source — don't keep it
            }
          }
          validSources.push(src);
        }
        if (sourcesRemoved > 0) {
          movie.streamingSources = validSources as any;
        }
      }

      // Check trailer
      if (movie.trailerUrl && this.isBunnyUrl(movie.trailerUrl)) {
        const { valid, size } = await this.validateCdnFile(movie.trailerUrl);
        if (!valid) {
          this.logger.warn(`Bad CDN trailer: ${movie.title} — ${movie.trailerUrl} (${size} bytes)`);
          const deleted = await this.deleteBunnyFile(movie.trailerUrl);
          if (deleted) bunnyFilesDeleted++;
          movie.trailerUrl = '';
          sourcesRemoved++;
        }
      }

      if (sourcesRemoved > 0) {
        await movie.save();
        moviesReverted.push({ id: movie._id.toString(), title: movie.title, sourcesRemoved });
      }
    }

    // --- Episodes ---
    const allEpisodes = await this.episodeModel.find().exec();
    for (const episode of allEpisodes) {
      let sourcesRemoved = 0;

      if (episode.streamingSources?.length) {
        const validSources = [];
        for (const src of episode.streamingSources) {
          if (this.isBunnyUrl(src.url)) {
            const { valid, size } = await this.validateCdnFile(src.url);
            if (!valid) {
              this.logger.warn(
                `Bad CDN episode: ${episode.title} Ep${episode.episodeNumber} — ${src.url} (${size} bytes)`,
              );
              const deleted = await this.deleteBunnyFile(src.url);
              if (deleted) bunnyFilesDeleted++;
              sourcesRemoved++;
              continue;
            }
          }
          validSources.push(src);
        }
        if (sourcesRemoved > 0) {
          episode.streamingSources = validSources as any;
        }
      }

      if (sourcesRemoved > 0) {
        await episode.save();
        episodesReverted.push({
          id: episode._id.toString(),
          title: `${episode.title || 'Episode'} ${episode.episodeNumber}`,
          sourcesRemoved,
        });
      }
    }

    this.logger.log(
      `Revert complete: ${moviesReverted.length} movies, ${episodesReverted.length} episodes reverted, ${bunnyFilesDeleted} Bunny files deleted`,
    );

    return { moviesReverted, episodesReverted, bunnyFilesDeleted, errors };
  }

  /**
   * Bulk-set streaming sources for movies using Drive file IDs.
   * Accepts a map of { movieId: driveFileId } and sets the Worker stream URL.
   */
  async bulkSetDriveUrls(
    mappings: { movieId: string; driveFileId: string; quality?: string }[],
  ): Promise<{ updated: number; errors: string[] }> {
    let updated = 0;
    const errors: string[] = [];

    for (const { movieId, driveFileId, quality } of mappings) {
      try {
        const movie = await this.movieModel.findById(movieId);
        if (!movie) {
          errors.push(`Movie not found: ${movieId}`);
          continue;
        }
        const workerUrl = `${this.workerUrl}/stream/${driveFileId}`;
        movie.streamingSources = [
          { label: quality || 'HD', url: workerUrl, quality: quality || '1080p', priority: 0 },
        ] as any;
        await movie.save();
        updated++;
        this.logger.log(`Set Drive URL for ${movie.title}: ${workerUrl}`);
      } catch (err) {
        errors.push(`${movieId}: ${err.message}`);
      }
    }

    return { updated, errors };
  }

  /**
   * Bulk-set streaming sources for episodes using Drive file IDs.
   */
  async bulkSetEpisodeDriveUrls(
    mappings: { episodeId: string; driveFileId: string; quality?: string }[],
  ): Promise<{ updated: number; errors: string[] }> {
    let updated = 0;
    const errors: string[] = [];

    for (const { episodeId, driveFileId, quality } of mappings) {
      try {
        const episode = await this.episodeModel.findById(episodeId);
        if (!episode) {
          errors.push(`Episode not found: ${episodeId}`);
          continue;
        }
        const workerUrl = `${this.workerUrl}/stream/${driveFileId}`;
        episode.streamingSources = [
          { label: quality || 'HD', url: workerUrl, quality: quality || '1080p', priority: 0 },
        ] as any;
        await episode.save();
        updated++;
      } catch (err) {
        errors.push(`${episodeId}: ${err.message}`);
      }
    }

    return { updated, errors };
  }

  /**
   * Recover episode Drive URLs from a Google Drive folder scan.
   * Uses the Worker /list endpoint to get file IDs, matches them to episodes by name/number.
   */
  async recoverEpisodesFromFolder(
    seasonId: string,
    folderUrl: string,
  ): Promise<{ recovered: number; total: number; errors: string[] }> {
    const errors: string[] = [];

    // Extract folder ID
    const folderIdMatch = folderUrl.match(/folders?\/([\w-]+)/);
    if (!folderIdMatch) {
      throw new Error('Invalid folder URL');
    }
    const folderId = folderIdMatch[1];

    // List folder contents via Worker
    const listUrl = `${this.workerUrl}/list?id=${folderId}`;
    const listRes = await fetch(listUrl);
    if (!listRes.ok) {
      throw new Error(`Worker folder list failed: ${listRes.status}`);
    }
    const files: { id: string; name: string; mimeType: string }[] = await listRes.json() as any;

    // Get episodes for this season
    const episodes = await this.episodeModel.find({ seasonId }).sort({ episodeNumber: 1 }).exec();
    if (!episodes.length) {
      throw new Error(`No episodes found for season ${seasonId}`);
    }

    // Filter to video files only
    const videoFiles = files.filter(
      (f) => f.mimeType?.startsWith('video/') || /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name),
    );

    // Sort video files naturally (by episode number in filename)
    videoFiles.sort((a, b) => {
      const numA = this.extractEpisodeNumber(a.name);
      const numB = this.extractEpisodeNumber(b.name);
      return numA - numB;
    });

    let recovered = 0;
    for (let i = 0; i < Math.min(episodes.length, videoFiles.length); i++) {
      const episode = episodes[i];
      const file = videoFiles[i];
      try {
        const workerUrl = `${this.workerUrl}/stream/${file.id}`;
        episode.streamingSources = [
          { label: 'HD', url: workerUrl, quality: '1080p', priority: 0 },
        ] as any;
        await episode.save();
        recovered++;
        this.logger.log(
          `Recovered Ep${episode.episodeNumber}: ${file.name} → ${workerUrl}`,
        );
      } catch (err) {
        errors.push(`Ep${episode.episodeNumber}: ${err.message}`);
      }
    }

    if (videoFiles.length < episodes.length) {
      errors.push(
        `Only ${videoFiles.length} video files found for ${episodes.length} episodes`,
      );
    }

    return { recovered, total: episodes.length, errors };
  }

  /** Extract episode number from a filename like "EP01.mp4" or "Episode 1.mkv" */
  private extractEpisodeNumber(filename: string): number {
    const match = filename.match(/(?:ep|episode|e)[\s._-]*(\d+)/i) || filename.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 999;
  }
}
