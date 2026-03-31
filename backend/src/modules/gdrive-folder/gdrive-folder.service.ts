import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SeriesService } from '../series/series.service';
import { Movie, MovieDocument } from '../../schemas/movie.schema';
import { Types } from 'mongoose';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export interface ScannedEpisode {
  fileId: string;
  fileName: string;
  episodeNumber: number;
  title: string;
  streamUrl: string;
  thumbnailUrl: string;
}

export interface ScannedSeason {
  seasonNumber: number;
  folderName?: string;
  folderId?: string;
  episodes: ScannedEpisode[];
}

export interface ScanResult {
  totalFiles: number;
  seasons: ScannedSeason[];
}

const VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|mov|webm|ts|m4v|flv|wmv|3gp)$/i;
const VIDEO_MIMES = ['video/mp4', 'video/x-matroska', 'video/avi', 'video/quicktime', 'video/webm', 'video/mp2t'];

@Injectable()
export class GdriveFolderService {
  private readonly logger = new Logger(GdriveFolderService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly seriesService: SeriesService,
    @InjectModel(Movie.name) private readonly movieModel: Model<MovieDocument>,
  ) {}

  /* ================================================================
   *  PUBLIC METHODS
   * ================================================================ */

  async scanFolder(folderUrl: string): Promise<ScanResult> {
    const folderId = this.extractFolderId(folderUrl);
    const workerUrl = this.configService.get<string>('DRIVE_WORKER_URL');
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');

    let topLevel: DriveFile[];
    if (workerUrl) {
      topLevel = await this.listViaWorker(folderId, workerUrl);
    } else if (apiKey) {
      topLevel = await this.listViaApi(folderId, apiKey);
    } else {
      topLevel = await this.listViaScrape(folderId);
    }

    if (topLevel.length === 0) {
      throw new BadRequestException(
        'No files found. Make sure the folder is shared as "Anyone with the link".',
      );
    }

    const folders = topLevel.filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
    const videos = topLevel.filter((f) => this.isVideo(f));

    const seasons: ScannedSeason[] = [];

    // Subfolders → treat each as a season
    if (folders.length > 0) {
      const sorted = [...folders].sort((a, b) => {
        const na = this.extractSeasonNumber(a.name) ?? Infinity;
        const nb = this.extractSeasonNumber(b.name) ?? Infinity;
        return na - nb || a.name.localeCompare(b.name);
      });

      for (let i = 0; i < sorted.length; i++) {
        const folder = sorted[i];
        const seasonNum = this.extractSeasonNumber(folder.name) ?? i + 1;

        let subFiles: DriveFile[];
        if (workerUrl) {
          subFiles = await this.listViaWorker(folder.id, workerUrl);
        } else if (apiKey) {
          subFiles = await this.listViaApi(folder.id, apiKey);
        } else {
          subFiles = await this.listViaScrape(folder.id);
        }

        const subVideos = subFiles.filter((f) => this.isVideo(f));
        if (subVideos.length > 0) {
          seasons.push({
            seasonNumber: seasonNum,
            folderName: folder.name,
            folderId: folder.id,
            episodes: this.buildEpisodes(subVideos),
          });
        }
      }
    }

    // Root-level videos → single season
    if (videos.length > 0) {
      const seasonNum = seasons.length > 0 ? Math.max(...seasons.map((s) => s.seasonNumber)) + 1 : 1;
      seasons.push({
        seasonNumber: seasonNum,
        episodes: this.buildEpisodes(videos),
      });
    }

    return {
      totalFiles: seasons.reduce((sum, s) => sum + s.episodes.length, 0),
      seasons,
    };
  }

  async importToSeries(
    seriesId: string,
    scanResult: ScanResult,
    driveFolderUrl?: string,
  ): Promise<{ seasonsCreated: number; episodesCreated: number }> {
    let seasonsCreated = 0;
    let episodesCreated = 0;
    const workerUrl = this.configService.get<string>('DRIVE_WORKER_URL');

    for (const scanned of scanResult.seasons) {
      const season = await this.seriesService.createSeason({
        seriesId: new Types.ObjectId(seriesId) as any,
        seasonNumber: scanned.seasonNumber,
        title: scanned.folderName || `Season ${scanned.seasonNumber}`,
      });
      seasonsCreated++;

      const episodes = scanned.episodes.map((ep) => ({
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        streamingSources: [{
          quality: 'original',
          url: workerUrl
            ? `${workerUrl}/stream/${ep.fileId}`
            : ep.streamUrl,
          label: 'Google Drive',
          priority: 0,
        }],
        thumbnailUrl: ep.thumbnailUrl,
      }));

      await this.seriesService.createBulkEpisodes(season._id.toString(), episodes);
      episodesCreated += episodes.length;
    }

    // Store the drive folder URL on the series for auto-refresh later
    if (driveFolderUrl) {
      await this.movieModel.findByIdAndUpdate(seriesId, { driveFolderUrl });
    }

    return { seasonsCreated, episodesCreated };
  }

  /**
   * Re-scan a series' linked Drive folder and add any missing episodes.
   */
  async refreshFromDrive(seriesId: string): Promise<{ newEpisodes: number }> {
    const movie = await this.movieModel.findById(seriesId).lean();
    if (!movie?.driveFolderUrl) {
      throw new BadRequestException('No Drive folder linked to this series.');
    }

    const scan = await this.scanFolder(movie.driveFolderUrl);
    const existingSeasons = await this.seriesService.getSeasons(seriesId);
    const workerUrl = this.configService.get<string>('DRIVE_WORKER_URL');
    let newEpisodes = 0;

    for (const scanned of scan.seasons) {
      // Find existing season or create new one
      let season = existingSeasons.find((s) => s.seasonNumber === scanned.seasonNumber);
      if (!season) {
        season = await this.seriesService.createSeason({
          seriesId: new Types.ObjectId(seriesId) as any,
          seasonNumber: scanned.seasonNumber,
          title: scanned.folderName || `Season ${scanned.seasonNumber}`,
        });
      }

      const existingEps = await this.seriesService.getEpisodes(season._id.toString());
      const existingNums = new Set(existingEps.map((e) => e.episodeNumber));

      const newEps = scanned.episodes
        .filter((ep) => !existingNums.has(ep.episodeNumber))
        .map((ep) => ({
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          streamingSources: [{
            quality: 'original',
            url: workerUrl
              ? `${workerUrl}/stream/${ep.fileId}`
              : ep.streamUrl,
            label: 'Google Drive',
            priority: 0,
          }],
          thumbnailUrl: ep.thumbnailUrl,
        }));

      if (newEps.length > 0) {
        await this.seriesService.createBulkEpisodes(season._id.toString(), newEps);
        newEpisodes += newEps.length;
      }
    }

    return { newEpisodes };
  }

  /* ================================================================
   *  CLOUDFLARE WORKER INDEX (best — no API key, works from any IP)
   * ================================================================ */

  private async listViaWorker(folderId: string, workerUrl: string): Promise<DriveFile[]> {
    const url = `${workerUrl}/list?id=${folderId}`;
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Worker error: ${res.status} ${text}`);
      throw new BadRequestException(
        'Drive Worker failed to list folder. Ensure the folder is public.',
      );
    }

    const data = (await res.json()) as Array<{ id: string; name: string; mimeType: string }>;

    if (Array.isArray(data) && 'error' in data) {
      throw new BadRequestException((data as any).error);
    }

    return data.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType }));
  }

  /* ================================================================
   *  GOOGLE DRIVE v3 REST API (simple API key — works for ALL public folders)
   * ================================================================ */

  private async listViaApi(folderId: string, apiKey: string): Promise<DriveFile[]> {
    const files: DriveFile[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and trashed = false`,
        key: apiKey,
        fields: 'nextPageToken,files(id,name,mimeType)',
        pageSize: '1000',
        orderBy: 'name',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      );

      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`Drive API error: ${res.status} ${text}`);
        throw new BadRequestException(
          'Failed to list folder via Drive API. Ensure the folder is public.',
        );
      }

      const data = await res.json();
      for (const f of data.files || []) {
        files.push({ id: f.id, name: f.name, mimeType: f.mimeType });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return files;
  }

  /* ================================================================
   *  3-LAYER SCRAPING (no API key — tries multiple endpoints)
   * ================================================================ */

  private async listViaScrape(folderId: string): Promise<DriveFile[]> {
    // Layer 1: Embedded folder view — lightweight HTML table with direct links
    try {
      const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'text/html',
        },
        redirect: 'follow',
      });
      if (res.ok) {
        const html = await res.text();
        const files = this.parseEmbeddedHtml(html, folderId);
        if (files.length > 0) {
          this.logger.log(`Layer 1 (embedded view) → ${files.length} items`);
          return files;
        }
      } else {
        this.logger.warn(`Layer 1 HTTP ${res.status}`);
      }
    } catch (e) {
      this.logger.warn(`Layer 1 failed: ${e.message}`);
    }

    // Layer 2: Standard Drive folder page (?usp=sharing) — JS blob parsing
    try {
      const url = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });
      if (res.ok) {
        const html = await res.text();
        const files = this.parseHtml(html);
        if (files.length > 0) {
          this.logger.log(`Layer 2 (standard page) → ${files.length} items`);
          return files;
        }
      } else {
        this.logger.warn(`Layer 2 HTTP ${res.status}`);
      }
    } catch (e) {
      this.logger.warn(`Layer 2 failed: ${e.message}`);
    }

    // Layer 3: Alternate path (/drive/u/0/) with mobile-style headers
    try {
      const url = `https://drive.google.com/drive/u/0/folders/${folderId}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
          Accept: 'text/html',
          'Accept-Language': 'en',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
        },
        redirect: 'follow',
      });
      if (res.ok) {
        const html = await res.text();
        const files = this.parseHtml(html);
        if (files.length > 0) {
          this.logger.log(`Layer 3 (u/0 mobile) → ${files.length} items`);
          return files;
        }
      } else {
        this.logger.warn(`Layer 3 HTTP ${res.status}`);
      }
    } catch (e) {
      this.logger.warn(`Layer 3 failed: ${e.message}`);
    }

    throw new BadRequestException(
      'Could not list folder contents (all 3 layers failed). Ensure the folder is shared as "Anyone with the link".',
    );
  }

  /* -------- Embedded-view parser (Layer 1) -------- */

  private parseEmbeddedHtml(html: string, parentFolderId: string): DriveFile[] {
    const files: DriveFile[] = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;

    // Files: href="/file/d/FILE_ID/view…">filename</a>
    const fileRe = /href="[^"]*\/file\/d\/([\w-]+)\/[^"]*"[^>]*>\s*([^<]+)/gi;
    while ((m = fileRe.exec(html)) !== null) {
      const id = m[1];
      const name = m[2].trim();
      if (!seen.has(id)) {
        seen.add(id);
        files.push({ id, name, mimeType: this.guessMime(name) });
      }
    }

    // Subfolders: href="…/folders/FOLDER_ID…">foldername</a>
    const folderRe = /href="[^"]*\/folders\/([\w-]+)[^"]*"[^>]*>\s*([^<]+)/gi;
    while ((m = folderRe.exec(html)) !== null) {
      const id = m[1];
      const name = m[2].trim();
      if (!seen.has(id) && id !== parentFolderId) {
        seen.add(id);
        files.push({ id, name, mimeType: 'application/vnd.google-apps.folder' });
      }
    }

    // data-id attribute fallback
    const dataRe = /data-id="([\w-]{20,})"[^>]*?aria-label="([^"]+)"/gi;
    while ((m = dataRe.exec(html)) !== null) {
      const id = m[1];
      const name = m[2].trim();
      if (!seen.has(id) && id !== parentFolderId) {
        seen.add(id);
        files.push({ id, name, mimeType: this.guessMime(name) });
      }
    }

    return files;
  }

  /* -------- Standard-page parser (Layer 2 & 3) -------- */

  private parseHtml(html: string): DriveFile[] {
    // Unescape hex- and unicode-encoded chars that Google embeds in <script> tags
    const unescaped = html
      .replace(/\\x([\da-fA-F]{2})/g, (_, h) =>
        String.fromCharCode(parseInt(h, 16)),
      )
      .replace(/\\u([\da-fA-F]{4})/g, (_, h) =>
        String.fromCharCode(parseInt(h, 16)),
      );

    const files: DriveFile[] = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;

    // Pattern 1: ["FILE_ID",["FILENAME"]]
    const p1 = /\["([\w-]{25,})",\["([^"]+)"\]/g;
    while ((m = p1.exec(unescaped)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        files.push({ id: m[1], name: m[2], mimeType: this.guessMime(m[2]) });
      }
    }

    // Pattern 2: Broader — ["FILE_ID","FILENAME"]
    if (files.length === 0) {
      const p2 = /\["([\w-]{25,})","([^"]+)"/g;
      while ((m = p2.exec(unescaped)) !== null) {
        if (!seen.has(m[1]) && !m[2].startsWith('http') && m[2].length < 200) {
          seen.add(m[1]);
          files.push({ id: m[1], name: m[2], mimeType: this.guessMime(m[2]) });
        }
      }
    }

    // Pattern 3: data-id attribute
    if (files.length === 0) {
      const p3 = /data-id="([\w-]{25,})"[^>]*>[\s\S]*?class="[^"]*entry-title[^"]*"[^>]*>([^<]+)/g;
      while ((m = p3.exec(html)) !== null) {
        if (!seen.has(m[1])) {
          seen.add(m[1]);
          files.push({ id: m[1], name: m[2].trim(), mimeType: this.guessMime(m[2].trim()) });
        }
      }
    }

    // Pattern 4: AF_initDataCallback data blobs (modern Drive UI)
    if (files.length === 0) {
      const initRe = /AF_initDataCallback\(\{[^}]*data:([\s\S]*?)\}\s*\)\s*;/g;
      while ((m = initRe.exec(html)) !== null) {
        const blob = m[1];
        const idNameRe = /"([\w-]{25,})"[\s,]*"([^"]{1,200})"/g;
        let sm: RegExpExecArray | null;
        while ((sm = idNameRe.exec(blob)) !== null) {
          if (!seen.has(sm[1]) && !sm[2].startsWith('http')) {
            seen.add(sm[1]);
            files.push({ id: sm[1], name: sm[2], mimeType: this.guessMime(sm[2]) });
          }
        }
      }
    }

    // Pattern 5: href-based file/folder links in HTML body
    if (files.length === 0) {
      const hrefFileRe = /href="[^"]*\/file\/d\/([\w-]+)\/[^"]*"[^>]*>\s*([^<]+)/gi;
      while ((m = hrefFileRe.exec(html)) !== null) {
        if (!seen.has(m[1])) {
          seen.add(m[1]);
          files.push({ id: m[1], name: m[2].trim(), mimeType: this.guessMime(m[2].trim()) });
        }
      }
      const hrefFolderRe = /href="[^"]*\/folders\/([\w-]+)[^"]*"[^>]*>\s*([^<]+)/gi;
      while ((m = hrefFolderRe.exec(html)) !== null) {
        if (!seen.has(m[1])) {
          seen.add(m[1]);
          files.push({ id: m[1], name: m[2].trim(), mimeType: 'application/vnd.google-apps.folder' });
        }
      }
    }

    return files;
  }

  /* ================================================================
   *  HELPERS
   * ================================================================ */

  private extractFolderId(url: string): string {
    const m1 = url.match(/drive\.google\.com\/drive\/folders\/([\w-]+)/);
    if (m1) return m1[1];
    const m2 = url.match(/[?&]id=([\w-]+)/);
    if (m2) return m2[1];
    // If they just pasted an ID directly
    if (/^[\w-]{20,}$/.test(url.trim())) return url.trim();
    throw new BadRequestException(
      'Invalid Google Drive folder URL. Paste the link from "Share → Copy link".',
    );
  }

  private isVideo(f: DriveFile): boolean {
    if (f.mimeType.startsWith('video/')) return true;
    if (VIDEO_MIMES.includes(f.mimeType)) return true;
    return VIDEO_EXTENSIONS.test(f.name);
  }

  private guessMime(name: string): string {
    if (/\.mp4$/i.test(name)) return 'video/mp4';
    if (/\.mkv$/i.test(name)) return 'video/x-matroska';
    if (/\.avi$/i.test(name)) return 'video/avi';
    if (/\.mov$/i.test(name)) return 'video/quicktime';
    if (/\.webm$/i.test(name)) return 'video/webm';
    if (/\.ts$/i.test(name)) return 'video/mp2t';
    if (/\.m4v$/i.test(name)) return 'video/mp4';
    // No extension or non-video → could be a folder
    if (!/\.\w+$/.test(name)) return 'application/vnd.google-apps.folder';
    return 'application/octet-stream';
  }

  private extractSeasonNumber(name: string): number | null {
    // "Season 1", "S01", "S1", "Season01", "season-1"
    const m = name.match(/(?:season|s)\s*[-_.]?\s*(\d+)/i);
    if (m) return parseInt(m[1], 10);
    // Bare number: "1", "01", "02"
    const m2 = name.match(/^(\d{1,2})$/);
    if (m2) return parseInt(m2[1], 10);
    return null;
  }

  private extractEpisodeNumber(name: string): number | null {
    // "S01E05", "s1e5"
    const m1 = name.match(/[Ss]\d+\s*[Ee](\d+)/);
    if (m1) return parseInt(m1[1], 10);
    // "E05", "EP05", "Episode 5", "Ep.5", "Ep 05"
    const m2 = name.match(/(?:^|[^a-z])e(?:p(?:isode)?)?[\s._-]*(\d+)/i);
    if (m2) return parseInt(m2[1], 10);
    // "- 05 -", "- 05.", "05."  (standalone 2-digit number)
    const m3 = name.match(/(?:^|[\s._-])(\d{1,3})(?:[\s._-]|$)/);
    if (m3) return parseInt(m3[1], 10);
    return null;
  }

  private cleanEpisodeTitle(name: string): string {
    // Remove file extension
    let title = name.replace(/\.\w{2,4}$/, '');
    // Remove common patterns like [1080p], (720p), etc.
    title = title.replace(/[\[(]\d{3,4}p[\])]/gi, '');
    // Remove leading "S01E01 -" style prefixes
    title = title.replace(/^[Ss]\d+[Ee]\d+\s*[-_.]\s*/, '');
    // Remove leading episode numbers "01 -", "E01 -"
    title = title.replace(/^[Ee]?[Pp]?\d{1,3}\s*[-_.]\s*/, '');
    // Clean up remaining separators
    title = title.replace(/[._]/g, ' ').trim();
    return title || name.replace(/\.\w{2,4}$/, '');
  }

  private buildEpisodes(files: DriveFile[]): ScannedEpisode[] {
    // Sort files by extracted episode number, then by name
    const withNumbers = files.map((f) => ({
      file: f,
      epNum: this.extractEpisodeNumber(f.name),
    }));

    withNumbers.sort((a, b) => {
      if (a.epNum !== null && b.epNum !== null) return a.epNum - b.epNum;
      if (a.epNum !== null) return -1;
      if (b.epNum !== null) return 1;
      return a.file.name.localeCompare(b.file.name);
    });

    let nextNumber = 1;
    return withNumbers.map(({ file, epNum }) => {
      const episodeNumber = epNum ?? nextNumber;
      nextNumber = episodeNumber + 1;

      const cleaned = this.cleanEpisodeTitle(file.name);
      const title = cleaned || `Episode ${episodeNumber}`;
      const driveUrl = `https://drive.google.com/file/d/${file.id}/view`;

      return {
        fileId: file.id,
        fileName: file.name,
        episodeNumber,
        title,
        streamUrl: driveUrl,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
      };
    });
  }
}
