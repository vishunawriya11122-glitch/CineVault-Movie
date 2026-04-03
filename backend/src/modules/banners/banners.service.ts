import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Banner, BannerDocument, BannerSection, BannerType } from '../../schemas/banner.schema';
import { Movie, MovieDocument, ContentStatus } from '../../schemas/movie.schema';

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
  ) {}

  async getActiveBanners(section?: string): Promise<any[]> {
    try {
      const now = new Date();
      const filter: any = {
        isActive: true,
        $or: [
          { activeFrom: { $exists: false }, activeTo: { $exists: false } },
          { activeFrom: { $lte: now }, activeTo: { $gte: now } },
          { activeFrom: { $lte: now }, activeTo: { $exists: false } },
          { activeFrom: { $exists: false }, activeTo: { $gte: now } },
        ],
      };

      // Filter by section — default to 'home' if not specified
      if (section) {
        filter.section = section;
      } else {
        filter.section = BannerSection.HOME;
      }

      // Only return hero banners for the carousel
      filter.type = { $in: [BannerType.HERO, null, undefined] };
      // Also match documents that don't have the type field yet
      filter.$and = [
        { $or: [{ type: BannerType.HERO }, { type: { $exists: false } }, { type: null }] },
      ];
      delete filter.type;

      const banners = await this.bannerModel
        .find(filter)
        .sort({ displayOrder: 1 });
      
      // Filter out banners with invalid contentId before populating
      const validBanners = banners.filter((banner) => {
        if (!banner.contentId) return true; // Banners without content are allowed (pre-release)
        
        const contentIdStr = String(banner.contentId);
        if (contentIdStr.trim() === '') return true;
        
        try {
          new Types.ObjectId(contentIdStr);
          return true;
        } catch {
          return false;
        }
      });
      
      // Populate banners that have contentId
      const bannersWithContent = validBanners.filter(b => b.contentId);
      const bannersWithoutContent = validBanners.filter(b => !b.contentId);

      if (bannersWithContent.length > 0) {
        await this.bannerModel.populate(bannersWithContent, {
          path: 'contentId',
          select: 'title contentType genres contentRating duration releaseYear starRating synopsis posterUrl bannerUrl logoUrl',
        });
      }

      // Return all valid banners (with or without content) — no fallback to other sections
      return [...bannersWithContent, ...bannersWithoutContent].sort(
        (a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0),
      );
    } catch (error) {
      console.error('Error fetching active banners:', error);
      return [];
    }
  }

  async getMidBanners(section?: string): Promise<any[]> {
    try {
      const now = new Date();
      const filter: any = {
        isActive: true,
        type: BannerType.MID,
        $or: [
          { activeFrom: { $exists: false }, activeTo: { $exists: false } },
          { activeFrom: { $lte: now }, activeTo: { $gte: now } },
          { activeFrom: { $lte: now }, activeTo: { $exists: false } },
          { activeFrom: { $exists: false }, activeTo: { $gte: now } },
        ],
      };

      if (section) {
        filter.section = section;
      } else {
        filter.section = BannerSection.HOME;
      }

      const banners = await this.bannerModel
        .find(filter)
        .sort({ displayOrder: 1 })
        .populate('contentId', 'title contentType posterUrl bannerUrl');

      return banners;
    } catch (error) {
      console.error('Error fetching mid banners:', error);
      return [];
    }
  }

  async getAll(section?: string): Promise<BannerDocument[]> {
    try {
      const filter: any = {};
      if (section) filter.section = section;
      const banners = await this.bannerModel.find(filter).sort({ displayOrder: 1 }).populate('contentId', 'title posterUrl');
      return banners;
    } catch (error) {
      console.error('Error fetching all banners with populate:', error);
      const filter: any = {};
      if (section) filter.section = section;
      return this.bannerModel.find(filter).sort({ displayOrder: 1 });
    }
  }

  async create(data: Partial<Banner>): Promise<BannerDocument> {
    // Default section to 'home' if not provided
    if (!data.section) data.section = BannerSection.HOME;
    const banner = await this.bannerModel.create(data);
    return banner;
  }

  async update(id: string, data: Partial<Banner>): Promise<BannerDocument> {
    const banner = await this.bannerModel.findByIdAndUpdate(id, data, { new: true });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async delete(id: string): Promise<void> {
    const result = await this.bannerModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Banner not found');
  }

  async reorder(orderedIds: string[]): Promise<void> {
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { displayOrder: index },
      },
    }));
    await this.bannerModel.bulkWrite(bulkOps);
  }
}
