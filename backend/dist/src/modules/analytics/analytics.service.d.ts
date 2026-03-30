import { Model } from 'mongoose';
import { UserDocument } from '../../schemas/user.schema';
import { MovieDocument } from '../../schemas/movie.schema';
import { WatchProgressDocument } from '../../schemas/watch-progress.schema';
export declare class AnalyticsService {
    private userModel;
    private movieModel;
    private progressModel;
    constructor(userModel: Model<UserDocument>, movieModel: Model<MovieDocument>, progressModel: Model<WatchProgressDocument>);
    getDashboard(): Promise<any>;
    getUserSignups(days?: number): Promise<any[]>;
    getMostWatched(limit?: number): Promise<any[]>;
}
