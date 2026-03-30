import { Model } from 'mongoose';
import { WatchProgressDocument } from '../../schemas/watch-progress.schema';
export declare class WatchProgressService {
    private progressModel;
    constructor(progressModel: Model<WatchProgressDocument>);
    updateProgress(userId: string, profileId: string, data: {
        contentId: string;
        contentType: string;
        currentTime: number;
        totalDuration: number;
        seriesId?: string;
        episodeTitle?: string;
        contentTitle?: string;
        thumbnailUrl?: string;
    }): Promise<WatchProgressDocument>;
    getContinueWatching(userId: string, profileId: string, limit?: number): Promise<WatchProgressDocument[]>;
    getWatchHistory(userId: string, profileId: string, page?: number, limit?: number): Promise<{
        items: WatchProgressDocument[];
        total: number;
    }>;
    getProgress(userId: string, profileId: string, contentId: string): Promise<WatchProgressDocument | null>;
    getLatestEpisodeForSeries(userId: string, profileId: string, seriesId: string): Promise<WatchProgressDocument | null>;
    clearHistory(userId: string, profileId: string): Promise<void>;
}
