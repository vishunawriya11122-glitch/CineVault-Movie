import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Season, SeasonDocument, Episode, EpisodeDocument } from '../../schemas/series.schema';

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
      ...ep,
      seasonId: new Types.ObjectId(seasonId),
      episodeNumber: ep.episodeNumber ?? nextNumber++,
    }));

    const created = await this.episodeModel.insertMany(docs);
    await this.seasonModel.findByIdAndUpdate(seasonId, { $inc: { episodeCount: created.length } });
    return created as EpisodeDocument[];
  }

  async updateEpisode(id: string, data: Partial<Episode>): Promise<EpisodeDocument> {
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
}
