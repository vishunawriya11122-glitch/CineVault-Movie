import { WatchlistService } from './watchlist.service';
export declare class WatchlistController {
    private readonly watchlistService;
    constructor(watchlistService: WatchlistService);
    getWatchlist(userId: string, profileId: string): Promise<import("../../schemas/watchlist.schema").WatchlistDocument[]>;
    add(userId: string, profileId: string, contentId: string): Promise<{
        message: string;
    }>;
    remove(userId: string, profileId: string, contentId: string): Promise<{
        message: string;
    }>;
    check(userId: string, profileId: string, contentId: string): Promise<{
        inWatchlist: boolean;
    }>;
}
