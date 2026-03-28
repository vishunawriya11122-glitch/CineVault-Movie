import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Season, SeasonDocument, Episode, EpisodeDocument } from '../../schemas/series.schema';

/**
 * Derive a Google Drive thumbnail URL from any Drive sharing/streaming URL.
 * Returns null if the URL is not a Drive URL.
 */
function getDriveThumbnailUrl(url: string): string | null {
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
    /drive\.usercontent\.google\.com\/.*id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }
  }
  return null;
}

/** Auto-set thumbnailUrl from the first streaming source Drive URL if not already set. */
function autoSetThumbnail<T extends { thumbnailUrl?: string; streamingSources?: { url: string }[] }>(data: T): T {
  if (!data.thumbnailUrl && data.streamingSources?.length) {
    const thumb = getDriveThumbnailUrl(data.streamingSources[0].url);
    if (thumb) data.thumbnailUrl = thumb;
  }
  return data;
}

/**
 * Convert any Google Drive link to a direct-download URL that video players can stream.
 * Handles: /file/d/ID/view, /open?id=ID, /uc?id=ID, and already-converted URLs.
 */
function toDirectDriveUrl(url: string): string {
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
    /drive\.usercontent\.google\.com\/.*id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://drive.usercontent.google.com/download?id=${match[1]}&export=download&confirm=t`;
    }
  }
  return url;
}

/** Convert all streaming source URLs in an episode's data. */
function convertStreamingSources<T extends { streamingSources?: { quality: string; url: string; label?: string }[] }>(data: T): T {
  if (data.streamingSources && Array.isArray(data.streamingSources)) {
    data.streamingSources = data.streamingSources.map((src) => ({
      ...src,
      url: toDirectDriveUrl(src.url),
    }));
  }
  return data;
}

@Injectable()
export class SeriesService {
  constructor(
    @InjectModel(Season.name) private seasonModel: Model<SeasonDocument>,
    @InjectModel(Episode.name) private episodeModel: Model<EpisodeDocument>,
  ) {}

  // Seasons
  async getSeasons(seriesId: string): Promise<SeasonDocument[]> {
    // Query with both ObjectId and string to handle both storage formats
    return this.seasonModel.find({
      $or: [
        { seriesId: new Types.ObjectId(seriesId) },
        { seriesId: seriesId },
      ],
    }).sort({ seasonNumber: 1 });
  }

  async createSeason(data: Partial<Season>): Promise<SeasonDocument> {
    // Ensure seriesId is stored as ObjectId, not string
    if (data.seriesId && typeof data.seriesId === 'string') {
      data.seriesId = new Types.ObjectId(data.seriesId) as any;
    }
    return this.seasonModel.create(data);
  }

  async updateSeason(id: string, data: Partial<Season>): Promise<SeasonDocument> {
    const season = await this.seasonModel.findByIdAndUpdate(id, data, { new: true });
    if (!season) throw new NotFoundException('Season not found');
    return season;
  }

  async deleteSeason(id: string): Promise<void> {
    await this.seasonModel.findByIdAndDelete(id);
    await this.episodeModel.deleteMany({
      $or: [
        { seasonId: new Types.ObjectId(id) },
        { seasonId: id },
      ],
    });
  }

  // Episodes
  async getEpisodes(seasonId: string): Promise<EpisodeDocument[]> {
    return this.episodeModel.find({
      $or: [
        { seasonId: new Types.ObjectId(seasonId) },
        { seasonId: seasonId },
      ],
    }).sort({ episodeNumber: 1 });
  }

  async getEpisode(id: string): Promise<EpisodeDocument> {
    const episode = await this.episodeModel.findById(id);
    if (!episode) throw new NotFoundException('Episode not found');
    return episode;
  }

  async createEpisode(data: Partial<Episode>): Promise<EpisodeDocument> {
    // Ensure seasonId is stored as ObjectId
    if (data.seasonId && typeof data.seasonId === 'string') {
      data.seasonId = new Types.ObjectId(data.seasonId) as any;
    }
    // Auto-convert Google Drive URLs to direct download format
    convertStreamingSources(data);
    // Auto-derive thumbnail from Drive source if not provided
    autoSetThumbnail(data);
    const episode = await this.episodeModel.create(data);
    await this.seasonModel.findByIdAndUpdate(data.seasonId, { $inc: { episodeCount: 1 } });
    return episode;
  }

  async createBulkEpisodes(seasonId: string, episodes: Partial<Episode>[]): Promise<EpisodeDocument[]> {
    // Get current max episode number for this season
    const lastEpisode = await this.episodeModel
      .findOne({ seasonId: new Types.ObjectId(seasonId) })
      .sort({ episodeNumber: -1 });
    let nextNumber = (lastEpisode?.episodeNumber ?? 0) + 1;

    const docs = episodes.map((ep) => ({
      ...convertStreamingSources(autoSetThumbnail(ep)),
      seasonId: new Types.ObjectId(seasonId),
      episodeNumber: ep.episodeNumber ?? nextNumber++,
    }));

    const created = await this.episodeModel.insertMany(docs);
    await this.seasonModel.findByIdAndUpdate(seasonId, { $inc: { episodeCount: created.length } });
    return created as EpisodeDocument[];
  }

  async updateEpisode(id: string, data: Partial<Episode>): Promise<EpisodeDocument> {
    // Auto-convert Google Drive URLs to direct download format
    convertStreamingSources(data);
    // Auto-derive thumbnail if streaming sources updated and no thumbnail provided
    autoSetThumbnail(data);
    const episode = await this.episodeModel.findByIdAndUpdate(id, data, { new: true });
    if (!episode) throw new NotFoundException('Episode not found');
    return episode;
  }

  async deleteEpisode(id: string): Promise<void> {
    const episode = await this.episodeModel.findByIdAndDelete(id);
    if (episode) {
      await this.seasonModel.findByIdAndUpdate(episode.seasonId, { $inc: { episodeCount: -1 } });
    }
  }

  /** Retroactively generate Drive thumbnails for all episodes in a season that have no thumbnailUrl. */
  async generateThumbnailsForSeason(seasonId: string): Promise<{ updated: number; skipped: number }> {
    const episodes = await this.getEpisodes(seasonId);
    let updated = 0;
    let skipped = 0;
    for (const ep of episodes) {
      if (ep.thumbnailUrl) { skipped++; continue; }
      const sources = ep.streamingSources as { url: string }[] | undefined;
      if (!sources?.length) { skipped++; continue; }
      const thumb = getDriveThumbnailUrl(sources[0].url);
      if (!thumb) { skipped++; continue; }
      await this.episodeModel.findByIdAndUpdate(ep._id, { thumbnailUrl: thumb });
      updated++;
    }
    return { updated, skipped };
  }
}
