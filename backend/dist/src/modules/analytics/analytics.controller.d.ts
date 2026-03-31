import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getDashboard(): Promise<any>;
    getSignups(days?: number): Promise<any[]>;
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
