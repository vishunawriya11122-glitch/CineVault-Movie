import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Season, SeasonDocument, Episode, EpisodeDocument } from '../../schemas/series.schema';
import { Movie, MovieDocument } from '../../schemas/movie.schema';

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private s3: S3Client | null = null;
  private bucket: string;
  private publicUrl: string;
  private workerUrl: string;
  private workerApiKey: string;
  private useWorker: boolean;

  constructor(
    private config: ConfigService,
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    @InjectModel(Season.name) private seasonModel: Model<SeasonDocument>,
    @InjectModel(Episode.name) private episodeModel: Model<EpisodeDocument>,
  ) {
    this.bucket = config.get<string>('R2_BUCKET', config.get<string>('S3_BUCKET', 'velora-media'));
    this.workerUrl = config.get<string>('R2_WORKER_URL', '').replace(/\/$/, '');
    this.workerApiKey = config.get<string>('R2_WORKER_API_KEY', 'velora-r2-default-key');
    this.publicUrl = config.get<string>('R2_PUBLIC_URL', config.get<string>('CDN_BASE_URL', this.workerUrl));

    // Use Worker proxy if R2_WORKER_URL is set and S3 keys aren't available
    const endpoint = config.get<string>('R2_ENDPOINT', config.get<string>('S3_ENDPOINT', ''));
    const accessKey = config.get<string>('R2_ACCESS_KEY', config.get<string>('S3_ACCESS_KEY', ''));
    const secretKey = config.get<string>('R2_SECRET_KEY', config.get<string>('S3_SECRET_KEY', ''));

    if (endpoint && accessKey && secretKey) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      });
      this.useWorker = false;
      this.logger.log('R2 Storage: Using S3-compatible API');
    } else if (this.workerUrl) {
      this.useWorker = true;
      this.logger.log(`R2 Storage: Using Worker proxy at ${this.workerUrl}`);
    } else {
      this.useWorker = false;
      this.logger.warn('R2 Storage: Not configured! Set R2_WORKER_URL or R2_ENDPOINT+R2_ACCESS_KEY+R2_SECRET_KEY');
    }
  }

  // ── List top-level "folders" in a prefix ──
  async listFolders(prefix: string = ''): Promise<{ folders: string[]; files: { key: string; size: number }[] }> {
    if (this.useWorker) return this.listFoldersViaWorker(prefix);

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      Delimiter: '/',
    });

    const result = await this.s3!.send(command);

    const folders = (result.CommonPrefixes || [])
      .map((p) => p.Prefix!)
      .filter(Boolean);

    const files = (result.Contents || [])
      .filter((obj) => obj.Key !== prefix) // exclude the prefix itself
      .filter((obj) => this.isVideoFile(obj.Key || ''))
      .map((obj) => ({
        key: obj.Key!,
        size: obj.Size || 0,
      }));

    return { folders, files };
  }

  // ── List ALL files recursively under a prefix ──
  async listAllFiles(prefix: string): Promise<{ key: string; size: number }[]> {
    if (this.useWorker) return this.listAllFilesViaWorker(prefix);
    const files: { key: string; size: number }[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const result = await this.s3!.send(command);

      for (const obj of result.Contents || []) {
        if (obj.Key && this.isVideoFile(obj.Key)) {
          files.push({ key: obj.Key, size: obj.Size || 0 });
        }
      }

      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);

    return files;
  }

  // ── Browse R2 bucket — returns folders and video files at given path ──
  async browse(path: string = ''): Promise<{
    currentPath: string;
    folders: { name: string; path: string }[];
    files: { name: string; path: string; size: number; url: string }[];
  }> {
    const prefix = path ? (path.endsWith('/') ? path : path + '/') : '';
    const { folders, files } = await this.listFolders(prefix);

    return {
      currentPath: prefix,
      folders: folders.map((f) => ({
        name: f.replace(prefix, '').replace(/\/$/, ''),
        path: f,
      })),
      files: files.map((f) => ({
        name: f.key.replace(prefix, ''),
        path: f.key,
        size: f.size,
        url: this.getPublicUrl(f.key),
      })),
    };
  }

  // ── Preview series structure from R2 folder ──
  // Given a series folder like "series/breaking-bad/", detect seasons and episodes
  async previewSeriesStructure(seriesPath: string): Promise<{
    seriesFolder: string;
    seasons: {
      seasonNumber: number;
      folderPath: string;
      episodes: { episodeNumber: number; title: string; key: string; size: number; url: string }[];
    }[];
    totalEpisodes: number;
  }> {
    const prefix = seriesPath.endsWith('/') ? seriesPath : seriesPath + '/';
    const allFiles = await this.listAllFiles(prefix);

    if (allFiles.length === 0) {
      throw new Error(`No video files found in ${prefix}`);
    }

    // Group by season
    const seasonMap = new Map<number, { episodeNumber: number; title: string; key: string; size: number; url: string }[]>();

    for (const file of allFiles) {
      // path relative to series folder
      const relativePath = file.key.replace(prefix, '');
      const { seasonNum, episodeNum, title } = this.parseR2Path(relativePath);

      if (!seasonMap.has(seasonNum)) seasonMap.set(seasonNum, []);
      seasonMap.get(seasonNum)!.push({
        episodeNumber: episodeNum,
        title,
        key: file.key,
        size: file.size,
        url: this.getPublicUrl(file.key),
      });
    }

    // Sort
    const seasons = [...seasonMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([seasonNumber, episodes]) => ({
        seasonNumber,
        folderPath: `${prefix}s${String(seasonNumber).padStart(2, '0')}/`,
        episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
      }));

    const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodes.length, 0);

    return { seriesFolder: prefix, seasons, totalEpisodes };
  }

  // ── Import series from R2 into database ──
  async importSeriesFromR2(
    seriesId: string,
    seriesPath: string,
  ): Promise<{
    seasons: { seasonNumber: number; imported: number; episodes: { episodeNumber: number; title: string; status: string; url: string }[] }[];
    totalImported: number;
  }> {
    const series = await this.movieModel.findById(seriesId);
    if (!series) throw new Error('Series not found');

    const preview = await this.previewSeriesStructure(seriesPath);
    const results: any[] = [];
    let totalImported = 0;

    for (const seasonData of preview.seasons) {
      // Find or create season
      let season = await this.seasonModel.findOne({
        seriesId: new Types.ObjectId(seriesId),
        seasonNumber: seasonData.seasonNumber,
      });

      if (!season) {
        season = await this.seasonModel.create({
          seriesId: new Types.ObjectId(seriesId),
          seasonNumber: seasonData.seasonNumber,
          title: `Season ${seasonData.seasonNumber}`,
          episodeCount: 0,
        });
      }

      const existingEpisodes = await this.episodeModel.find({ seasonId: season._id }).exec();
      const existingByNumber = new Map(existingEpisodes.map((e) => [e.episodeNumber, e]));

      let imported = 0;
      const episodeResults: any[] = [];

      for (const ep of seasonData.episodes) {
        const streamingSources = [
          { label: 'Direct', url: ep.url, quality: 'original', priority: 0 },
        ];

        if (existingByNumber.has(ep.episodeNumber)) {
          await this.episodeModel.findOneAndUpdate(
            { seasonId: season._id, episodeNumber: ep.episodeNumber },
            { title: ep.title, streamingSources, thumbnailUrl: '' },
          );
          episodeResults.push({ episodeNumber: ep.episodeNumber, title: ep.title, status: 'updated', url: ep.url });
        } else {
          await this.episodeModel.create({
            seasonId: season._id,
            episodeNumber: ep.episodeNumber,
            title: ep.title,
            streamingSources,
            thumbnailUrl: '',
          });
          episodeResults.push({ episodeNumber: ep.episodeNumber, title: ep.title, status: 'created', url: ep.url });
        }
        imported++;
      }

      // Update episode count
      const epCount = await this.episodeModel.countDocuments({ seasonId: season._id });
      await this.seasonModel.findByIdAndUpdate(season._id, { episodeCount: epCount });

      results.push({ seasonNumber: seasonData.seasonNumber, imported, episodes: episodeResults });
      totalImported += imported;
    }

    this.logger.log(`[R2 Import] ${series.title}: ${preview.seasons.length} seasons, ${totalImported} episodes imported`);
    return { seasons: results, totalImported };
  }

  // ── Helper: Parse R2 path to extract season/episode ──
  private parseR2Path(relativePath: string): { seasonNum: number; episodeNum: number; title: string } {
    const parts = relativePath.split('/').filter(Boolean);
    const filename = parts[parts.length - 1];

    let seasonNum = 1;
    let episodeNum = 1;

    // Check folder name for season
    if (parts.length >= 2) {
      const folderName = parts[parts.length - 2];
      const seasonMatch = folderName.match(/(?:season|s)[\s._-]*(\d+)/i);
      if (seasonMatch) seasonNum = parseInt(seasonMatch[1], 10);
    }

    // Check filename for episode number
    const epMatch =
      filename.match(/(?:ep|episode|e)[\s._-]*(\d+)/i) ||
      filename.match(/^(\d+)/);
    if (epMatch) episodeNum = parseInt(epMatch[1], 10);

    // Also handle S01E01 style in filename
    const seMatch = filename.match(/s(\d+)[\s._-]*e(\d+)/i);
    if (seMatch) {
      seasonNum = parseInt(seMatch[1], 10);
      episodeNum = parseInt(seMatch[2], 10);
    }

    // Clean title
    let title = filename.replace(/\.[^.]+$/, '');
    title = title.replace(/^(?:s\d+[\s._-]*)?(?:e|ep|episode)[\s._-]*\d+[\s._-]*/i, '');
    title = title.replace(/[._-]/g, ' ').trim();
    if (!title) title = `Episode ${episodeNum}`;

    return { seasonNum, episodeNum, title };
  }

  // ── Helper: Check if file is a video ──
  private isVideoFile(key: string): boolean {
    const ext = key.split('.').pop()?.toLowerCase();
    return ['mp4', 'mkv', 'avi', 'mov', 'webm', 'ts', 'm3u8', 'flv'].includes(ext || '');
  }

  // ── Helper: Build public URL ──
  private getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    }
    return `https://${this.bucket}.r2.dev/${key}`;
  }

  // ── Get presigned URL for direct upload to R2 from browser ──
  async getPresignedUploadUrl(
    folder: string,
    filename: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const key = cleanFolder ? `${cleanFolder}/${filename}` : filename;

    if (this.useWorker) {
      // Return the worker upload URL — admin will PUT directly to the worker
      const encodedKey = key.split('/').map(encodeURIComponent).join('/');
      const uploadUrl = `${this.workerUrl}/upload/${encodedKey}?apiKey=${encodeURIComponent(this.workerApiKey)}`;
      const publicUrl = this.getPublicUrl(key);
      return { uploadUrl, key, publicUrl };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3!, command, { expiresIn: 3600 });
    const publicUrl = this.getPublicUrl(key);

    this.logger.log(`[R2] Presigned upload URL generated for: ${key}`);
    return { uploadUrl, key, publicUrl };
  }

  // ── Get worker config for direct multipart uploads from admin ──
  getUploadConfig(): { workerUrl: string; apiKey: string; publicUrl: string; useWorker: boolean } {
    return {
      workerUrl: this.workerUrl,
      apiKey: this.workerApiKey,
      publicUrl: this.publicUrl,
      useWorker: this.useWorker,
    };
  }

  // ── Create a "folder" (zero-byte marker object) ──
  async createFolder(path: string): Promise<{ path: string }> {
    const folderKey = path.endsWith('/') ? path : path + '/';

    if (this.useWorker) {
      const encodedKey = folderKey.split('/').map(encodeURIComponent).join('/');
      await fetch(`${this.workerUrl}/folder/${encodedKey}?apiKey=${encodeURIComponent(this.workerApiKey)}`, {
        method: 'PUT',
      });
      this.logger.log(`[R2 Worker] Folder created: ${folderKey}`);
      return { path: folderKey };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: folderKey,
      Body: '',
      ContentType: 'application/x-directory',
    });
    await this.s3!.send(command);
    this.logger.log(`[R2] Folder created: ${folderKey}`);
    return { path: folderKey };
  }

  // ── Delete a file from R2 ──
  async deleteFile(key: string): Promise<{ deleted: string }> {
    if (this.useWorker) {
      const encodedKey = key.split('/').map(encodeURIComponent).join('/');
      await fetch(`${this.workerUrl}/delete/${encodedKey}?apiKey=${encodeURIComponent(this.workerApiKey)}`, {
        method: 'DELETE',
      });
      this.logger.log(`[R2 Worker] File deleted: ${key}`);
      return { deleted: key };
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3!.send(command);
    this.logger.log(`[R2] File deleted: ${key}`);
    return { deleted: key };
  }

  // ── Get bucket info / stats ──
  async getBucketInfo(): Promise<{ bucket: string; publicUrl: string; configured: boolean; mode: string }> {
    return {
      bucket: this.bucket,
      publicUrl: this.publicUrl || this.workerUrl || `https://${this.bucket}.r2.dev`,
      configured: this.useWorker || !!this.s3,
      mode: this.useWorker ? 'worker' : this.s3 ? 's3' : 'not-configured',
    };
  }

  // ═══════════════════════════════════════════
  //  Worker Proxy Methods
  // ═══════════════════════════════════════════

  private async listFoldersViaWorker(prefix: string): Promise<{ folders: string[]; files: { key: string; size: number }[] }> {
    const res = await fetch(`${this.workerUrl}/list?prefix=${encodeURIComponent(prefix)}&delimiter=/`);
    const data = await res.json() as any;

    const folders = (data.folders || []).map((f: any) => f.path || f);
    const files = (data.files || [])
      .filter((f: any) => this.isVideoFile(f.path || f.name || ''))
      .map((f: any) => ({ key: f.path || f.name, size: f.size || 0 }));

    return { folders, files };
  }

  private async listAllFilesViaWorker(prefix: string): Promise<{ key: string; size: number }[]> {
    // Recursively list all files by traversing folders
    const allFiles: { key: string; size: number }[] = [];
    const queue = [prefix];

    while (queue.length > 0) {
      const currentPrefix = queue.shift()!;
      const { folders, files } = await this.listFoldersViaWorker(currentPrefix);
      allFiles.push(...files);
      queue.push(...folders);
    }

    return allFiles;
  }
}
