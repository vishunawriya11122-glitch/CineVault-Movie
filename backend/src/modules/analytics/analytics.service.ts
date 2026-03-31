import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Movie, MovieDocument } from '../../schemas/movie.schema';
import { WatchProgress, WatchProgressDocument } from '../../schemas/watch-progress.schema';
import { ContentView, ContentViewDocument } from '../../schemas/content-view.schema';
import { Episode, EpisodeDocument, Season, SeasonDocument } from '../../schemas/series.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    @InjectModel(WatchProgress.name) private progressModel: Model<WatchProgressDocument>,
    @InjectModel(ContentView.name) private contentViewModel: Model<ContentViewDocument>,
    @InjectModel(Episode.name) private episodeModel: Model<EpisodeDocument>,
    @InjectModel(Season.name) private seasonModel: Model<SeasonDocument>,
  ) {}

  async getDashboard(): Promise<any> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      newUsersMonth,
      dau,
      mau,
      totalContent,
      topWatched,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ createdAt: { $gte: dayAgo } }),
      this.userModel.countDocuments({ createdAt: { $gte: monthAgo } }),
      this.userModel.countDocuments({ lastActiveAt: { $gte: dayAgo } }),
      this.userModel.countDocuments({ lastActiveAt: { $gte: monthAgo } }),
      this.movieModel.countDocuments(),
      this.movieModel.find().sort({ viewCount: -1 }).limit(10)
        .select('title viewCount rating posterUrl contentType'),
    ]);

    return {
      users: { total: totalUsers, newToday: newUsersToday, newThisMonth: newUsersMonth, dau, mau },
      content: { total: totalContent },
      topWatched,
    };
  }

  async getUserSignups(days = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.userModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getMostWatched(limit = 20): Promise<any[]> {
    return this.movieModel
      .find({ status: 'published' })
      .sort({ viewCount: -1 })
      .limit(limit)
      .select('title viewCount rating posterUrl contentType releaseYear');
  }

  /** View analytics: breakdown by content type (movies vs episodes) */
  async getViewAnalytics(): Promise<any> {
    const [movieViews, episodeViews, totalUniqueViews, recentViews] = await Promise.all([
      this.contentViewModel.countDocuments({ contentType: 'movie' }),
      this.contentViewModel.countDocuments({ contentType: 'episode' }),
      this.contentViewModel.countDocuments(),
      this.contentViewModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);
    return { movieViews, episodeViews, totalUniqueViews, recentViews };
  }

  /** Episode-level analytics for a specific series */
  async getSeriesEpisodeAnalytics(seriesId: string): Promise<any> {
    // Get all seasons for the series
    const seasons = await this.seasonModel.find({
      $or: [{ seriesId }, { seriesId: { $regex: new RegExp(`^${seriesId}$`) } }],
    }).sort({ seasonNumber: 1 });

    const result = [];
    for (const season of seasons) {
      const episodes = await this.episodeModel.find({
        $or: [{ seasonId: season._id }, { seasonId: season._id.toString() }],
      }).sort({ episodeNumber: 1 }).select('title episodeNumber viewCount thumbnailUrl');

      const totalSeasonViews = episodes.reduce((sum, ep) => sum + (ep.viewCount || 0), 0);
      const mostWatchedEpisode = episodes.reduce((max, ep) =>
        (ep.viewCount || 0) > (max?.viewCount || 0) ? ep : max, episodes[0]);

      result.push({
        seasonId: season._id,
        seasonNumber: season.seasonNumber,
        totalViews: totalSeasonViews,
        episodeCount: episodes.length,
        mostWatchedEpisode: mostWatchedEpisode ? {
          title: mostWatchedEpisode.title,
          episodeNumber: mostWatchedEpisode.episodeNumber,
          viewCount: mostWatchedEpisode.viewCount,
        } : null,
        episodes: episodes.map((ep) => ({
          id: ep._id,
          title: ep.title,
          episodeNumber: ep.episodeNumber,
          viewCount: ep.viewCount || 0,
        })),
      });
    }
    return result;
  }

  /** Top series by total episode views */
  async getTopSeries(limit = 10): Promise<any[]> {
    const pipeline = await this.contentViewModel.aggregate([
      { $match: { contentType: 'episode', seriesId: { $ne: null } } },
      { $group: { _id: '$seriesId', totalViews: { $sum: 1 } } },
      { $sort: { totalViews: -1 } },
      { $limit: limit },
    ]);

    // Enrich with movie (series) data
    const enriched = [];
    for (const item of pipeline) {
      const series = await this.movieModel.findById(item._id).select('title posterUrl contentType');
      enriched.push({
        seriesId: item._id,
        title: series?.title ?? 'Unknown',
        posterUrl: series?.posterUrl,
        contentType: series?.contentType,
        totalEpisodeViews: item.totalViews,
      });
    }
    return enriched;
  }

  /** Reset all view counts to zero and clear ContentView collection */
  async resetAllViews(): Promise<{ moviesReset: number; episodesReset: number; viewsDeleted: number }> {
    const [moviesResult, episodesResult, viewsDeleted] = await Promise.all([
      this.movieModel.updateMany({}, { $set: { viewCount: 0 } }),
      this.episodeModel.updateMany({}, { $set: { viewCount: 0 } }),
      this.contentViewModel.deleteMany({}),
    ]);
    return {
      moviesReset: moviesResult.modifiedCount,
      episodesReset: episodesResult.modifiedCount,
      viewsDeleted: viewsDeleted.deletedCount,
    };
  }
}
