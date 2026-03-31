import { Model } from 'mongoose';
import { Season, SeasonDocument, Episode, EpisodeDocument } from '../../schemas/series.schema';
import { ContentViewDocument } from '../../schemas/content-view.schema';
export declare class SeriesService {
    private seasonModel;
    private episodeModel;
    private contentViewModel;
    constructor(seasonModel: Model<SeasonDocument>, episodeModel: Model<EpisodeDocument>, contentViewModel: Model<ContentViewDocument>);
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
    trackEpisodeView(episodeId: string, userId: string, userEmail?: string, deviceId?: string): Promise<boolean>;
}
