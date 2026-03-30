import { WatchProgressService } from './watch-progress.service';
export declare class WatchProgressController {
    private readonly watchProgressService;
    constructor(watchProgressService: WatchProgressService);
    updateProgress(userId: string, profileId: string, body: {
        contentId: string;
        contentType: string;
        currentTime: number;
        totalDuration: number;
        seriesId?: string;
        episodeTitle?: string;
        contentTitle?: string;
        thumbnailUrl?: string;
    }): Promise<import("../../schemas/watch-progress.schema").WatchProgressDocument>;
    getContinueWatching(userId: string, profileId: string): Promise<import("../../schemas/watch-progress.schema").WatchProgressDocument[]>;
    getHistory(userId: string, profileId: string, page?: number, limit?: number): Promise<{
        items: import("../../schemas/watch-progress.schema").WatchProgressDocument[];
        total: number;
    }>;
    getLatestEpisodeForSeries(userId: string, profileId: string, seriesId: string): Promise<import("../../schemas/watch-progress.schema").WatchProgressDocument | null>;
    getProgress(userId: string, profileId: string, contentId: string): Promise<import("../../schemas/watch-progress.schema").WatchProgressDocument | null>;
    clearHistory(userId: string, profileId: string): Promise<{
        message: string;
    }>;
}
