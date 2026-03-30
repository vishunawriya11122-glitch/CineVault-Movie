import { Model } from 'mongoose';
import { Banner, BannerDocument } from '../../schemas/banner.schema';
import { MovieDocument } from '../../schemas/movie.schema';
export declare class BannersService {
    private bannerModel;
    private movieModel;
    constructor(bannerModel: Model<BannerDocument>, movieModel: Model<MovieDocument>);
    getActiveBanners(section?: string): Promise<any[]>;
    getAll(section?: string): Promise<BannerDocument[]>;
    create(data: Partial<Banner>): Promise<BannerDocument>;
    update(id: string, data: Partial<Banner>): Promise<BannerDocument>;
    delete(id: string): Promise<void>;
    reorder(orderedIds: string[]): Promise<void>;
}
