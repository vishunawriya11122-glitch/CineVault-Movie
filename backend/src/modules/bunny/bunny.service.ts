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

    const contentLength = downloadRes.headers.get('content-length');
    this.logger.log(
      `Downloading: ${sourceUrl.substring(0, 80)}... (${contentLength ? Math.round(Number(contentLength) / 1024 / 1024) + 'MB' : 'unknown size'})`,
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
}
