import { SeriesService } from './series.service';
export declare class SeriesController {
    private readonly seriesService;
    constructor(seriesService: SeriesService);
    getSeasons(seriesId: string): Promise<import("../../schemas/series.schema").SeasonDocument[]>;
    getEpisodes(seasonId: string): Promise<import("../../schemas/series.schema").EpisodeDocument[]>;
    getEpisode(id: string): Promise<import("../../schemas/series.schema").EpisodeDocument>;
    createSeason(seriesId: string, body: any): Promise<import("../../schemas/series.schema").SeasonDocument>;
    updateSeason(id: string, body: any): Promise<import("../../schemas/series.schema").SeasonDocument>;
    deleteSeason(id: string): Promise<{
        message: string;
    }>;
    createEpisode(seasonId: string, body: any): Promise<import("../../schemas/series.schema").EpisodeDocument>;
    createBulkEpisodes(seasonId: string, body: {
        episodes: any[];
    }): Promise<import("../../schemas/series.schema").EpisodeDocument[]>;
    updateEpisode(id: string, body: any): Promise<import("../../schemas/series.schema").EpisodeDocument>;
    deleteEpisode(id: string): Promise<{
        message: string;
    }>;
    generateThumbnails(seasonId: string): Promise<{
        updated: number;
        skipped: number;
    }>;
}
