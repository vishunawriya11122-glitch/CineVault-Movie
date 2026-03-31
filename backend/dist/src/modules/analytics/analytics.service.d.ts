import { Model } from 'mongoose';
import { UserDocument } from '../../schemas/user.schema';
import { MovieDocument } from '../../schemas/movie.schema';
import { WatchProgressDocument } from '../../schemas/watch-progress.schema';
import { ContentViewDocument } from '../../schemas/content-view.schema';
import { EpisodeDocument, SeasonDocument } from '../../schemas/series.schema';
export declare class AnalyticsService {
    private userModel;
    private movieModel;
    private progressModel;
    private contentViewModel;
    private episodeModel;
    private seasonModel;
    constructor(userModel: Model<UserDocument>, movieModel: Model<MovieDocument>, progressModel: Model<WatchProgressDocument>, contentViewModel: Model<ContentViewDocument>, episodeModel: Model<EpisodeDocument>, seasonModel: Model<SeasonDocument>);
    getDashboard(): Promise<any>;
    getUserSignups(days?: number): Promise<any[]>;
    getMostWatched(limit?: number): Promise<any[]>;
    getViewAnalytics(): Promise<any>;
    getSeriesEpisodeAnalytics(seriesId: string): Promise<any>;
    getTopSeries(limit?: number): Promise<any[]>;
    resetAllViews(): Promise<{
        moviesReset: number;
        episodesReset: number;
        viewsDeleted: number;
    }>;
}
