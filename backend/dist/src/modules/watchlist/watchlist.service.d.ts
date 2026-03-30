import { Model } from 'mongoose';
import { WatchlistDocument } from '../../schemas/watchlist.schema';
export declare class WatchlistService {
    private watchlistModel;
    constructor(watchlistModel: Model<WatchlistDocument>);
    addToWatchlist(userId: string, profileId: string, contentId: string): Promise<WatchlistDocument>;
    removeFromWatchlist(userId: string, profileId: string, contentId: string): Promise<void>;
    getWatchlist(userId: string, profileId: string): Promise<WatchlistDocument[]>;
    isInWatchlist(userId: string, profileId: string, contentId: string): Promise<boolean>;
}
