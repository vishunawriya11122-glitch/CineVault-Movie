import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WatchProgress, WatchProgressDocument } from '../../schemas/watch-progress.schema';

@Injectable()
export class WatchProgressService {
  constructor(
    @InjectModel(WatchProgress.name) private progressModel: Model<WatchProgressDocument>,
  ) {}

  async updateProgress(
    userId: string,
    profileId: string,
    data: {
      contentId: string;
      contentType: string;
      currentTime: number;
      totalDuration: number;
      seriesId?: string;
      episodeTitle?: string;
      contentTitle?: string;
      thumbnailUrl?: string;
    },
  ): Promise<WatchProgressDocument> {
    const isCompleted = data.totalDuration > 0 && (data.currentTime / data.totalDuration) >= 0.85;

    return this.progressModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        profileId: new Types.ObjectId(profileId),
        contentId: new Types.ObjectId(data.contentId),
      },
      {
        contentType: data.contentType,
        currentTime: data.currentTime,
        totalDuration: data.totalDuration,
        isCompleted,
        lastWatchedAt: new Date(),
        seriesId: data.seriesId ? new Types.ObjectId(data.seriesId) : undefined,
        episodeTitle: data.episodeTitle,
        contentTitle: data.contentTitle,
        thumbnailUrl: data.thumbnailUrl,
      },
      { upsert: true, new: true },
    );
  }

  async getContinueWatching(
    userId: string,
    profileId: string,
    limit = 20,
  ): Promise<WatchProgressDocument[]> {
    return this.progressModel
      .find({
        userId: new Types.ObjectId(userId),
        profileId: new Types.ObjectId(profileId),
        isCompleted: false,
      })
      .sort({ lastWatchedAt: -1 })
      .limit(limit);
  }

  async getWatchHistory(
    userId: string,
    profileId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: WatchProgressDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter = {
      userId: new Types.ObjectId(userId),
      profileId: new Types.ObjectId(profileId),
    };

    const [items, total] = await Promise.all([
      this.progressModel.find(filter).sort({ lastWatchedAt: -1 }).skip(skip).limit(limit),
      this.progressModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getProgress(
    userId: string,
    profileId: string,
    contentId: string,
  ): Promise<WatchProgressDocument | null> {
    return this.progressModel.findOne({
      userId: new Types.ObjectId(userId),
      profileId: new Types.ObjectId(profileId),
      contentId: new Types.ObjectId(contentId),
    });
  }

  async getLatestEpisodeForSeries(
    userId: string,
    profileId: string,
    seriesId: string,
  ): Promise<WatchProgressDocument | null> {
    // Primary: find episode progress records linked to this series via seriesId field
    const bySeriesId = await this.progressModel
      .findOne({
        userId: new Types.ObjectId(userId),
        profileId: new Types.ObjectId(profileId),
        seriesId: new Types.ObjectId(seriesId),
        contentType: 'episode',
      })
      .sort({ lastWatchedAt: -1 });

    return bySeriesId;
  }

  async clearHistory(userId: string, profileId: string): Promise<void> {
    await this.progressModel.deleteMany({
      userId: new Types.ObjectId(userId),
      profileId: new Types.ObjectId(profileId),
    });
  }
}
