import { Model } from 'mongoose';
import { Season, SeasonDocument, Episode, EpisodeDocument } from '../../schemas/series.schema';
export declare class SeriesService {
    private seasonModel;
    private episodeModel;
    constructor(seasonModel: Model<SeasonDocument>, episodeModel: Model<EpisodeDocument>);
    getSeasons(seriesId: string): Promise<SeasonDocument[]>;
    createSeason(data: Partial<Season>): Promise<SeasonDocument>;
    updateSeason(id: string, data: Partial<Season>): Promise<SeasonDocument>;
    deleteSeason(id: string): Promise<void>;
    getEpisodes(seasonId: string): Promise<EpisodeDocument[]>;
    getEpisode(id: string): Promise<EpisodeDocument>;
    createEpisode(data: Partial<Episode>): Promise<EpisodeDocument>;
    createBulkEpisodes(seasonId: string, episodes: Partial<Episode>[]): Promise<EpisodeDocument[]>;
    updateEpisode(id: string, data: Partial<Episode>): Promise<EpisodeDocument>;
    deleteEpisode(id: string): Promise<void>;
    generateThumbnailsForSeason(seasonId: string): Promise<{
        updated: number;
        skipped: number;
    }>;
}
