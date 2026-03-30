import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getDashboard(): Promise<any>;
    getSignups(days?: number): Promise<any[]>;
    getMostWatched(limit?: number): Promise<any[]>;
}
