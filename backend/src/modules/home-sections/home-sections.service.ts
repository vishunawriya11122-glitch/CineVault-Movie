import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HomeSection, HomeSectionDocument, TabSection, SectionType, CardSize } from '../../schemas/home-section.schema';
import { Movie, MovieDocument, ContentStatus } from '../../schemas/movie.schema';
import { Banner, BannerDocument, BannerType, BannerSection } from '../../schemas/banner.schema';

// ── Default "Recently Added" system sections ──────────────────────────────────
const RECENTLY_ADDED_DEFAULTS = [
  {
    slug: 'system-recently-added-home',
    title: 'Recently Added',
    section: TabSection.HOME,
    contentTypes: [] as string[], // empty = all content types
  },
  {
    slug: 'system-recently-added-movies',
    title: 'Recently Added',
    section: TabSection.MOVIES,
    contentTypes: ['movie'] as string[],
  },
  {
    slug: 'system-recently-added-shows',
    title: 'Recently Added',
    section: TabSection.SHOWS,
    contentTypes: ['web_series', 'tv_show'] as string[],
  },
  {
    slug: 'system-recently-added-anime',
    title: 'Recently Added',
    section: TabSection.ANIME,
    contentTypes: ['anime'] as string[],
  },
];

// ── Default "Upcoming" system sections ─────────────────────────────────────────
const UPCOMING_DEFAULTS = [
  {
    slug: 'system-upcoming-home',
    title: 'Upcoming',
    section: TabSection.HOME,
    contentTypes: [] as string[],
  },
  {
    slug: 'system-upcoming-movies',
    title: 'Upcoming',
    section: TabSection.MOVIES,
    contentTypes: [] as string[],
  },
  {
    slug: 'system-upcoming-shows',
    title: 'Upcoming',
    section: TabSection.SHOWS,
    contentTypes: [] as string[],
  },
  {
    slug: 'system-upcoming-anime',
    title: 'Upcoming',
    section: TabSection.ANIME,
    contentTypes: [] as string[],
  },
];

// ── Default "Trending" system sections ────────────────────────────────────────
const TRENDING_DEFAULTS = [
  {
    slug: 'system-trending-home',
    title: 'Most Watching \u2022 Trending Now',
    section: TabSection.HOME,
    contentTypes: [] as string[],
  },
  {
    slug: 'system-trending-movies',
    title: 'Trending Movies',
    section: TabSection.MOVIES,
    contentTypes: ['movie'] as string[],
  },
  {
    slug: 'system-trending-shows',
    title: 'Trending Shows',
    section: TabSection.SHOWS,
    contentTypes: ['web_series', 'tv_show'] as string[],
  },
  {
    slug: 'system-trending-anime',
    title: 'Trending Anime',
    section: TabSection.ANIME,
    contentTypes: ['anime'] as string[],
  },
];

@Injectable()
export class HomeSectionsService implements OnModuleInit {
  private readonly logger = new Logger(HomeSectionsService.name);

  constructor(
    @InjectModel(HomeSection.name) private sectionModel: Model<HomeSectionDocument>,
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
  ) {}

  async onModuleInit() {
    const result = await this.seedRecentlyAdded();
    if (result.created > 0) {
      this.logger.log(result.message);
    }

    // Make all upcoming sections universal (no category filtering)
    await this.sectionModel.updateMany(
      { type: SectionType.UPCOMING },
      { $set: { contentTypes: [], title: 'Upcoming' } },
    );

    // Run auto-release on startup, then every hour
    await this.autoReleaseUpcoming();
    setInterval(() => this.autoReleaseUpcoming(), 60 * 60 * 1000);
  }

  /**
   * Auto-release: any movie with status=UPCOMING and releaseDate <= today
   * gets moved to PUBLISHED so it appears in Recently Added and correct category sections.
   */
  async autoReleaseUpcoming(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.movieModel.updateMany(
      {
        status: ContentStatus.UPCOMING,
        releaseDate: { $lte: today },
      },
      {
        $set: { status: ContentStatus.PUBLISHED },
      },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Auto-released ${result.modifiedCount} upcoming title(s) to published`);
    }
  }

  async getHomeFeed(section?: string): Promise<any[]> {
    const filter: any = { isVisible: true };
    if (section) {
      filter.section = section;
    } else {
      filter.section = TabSection.HOME;
    }

    const sections = await this.sectionModel
      .find(filter)
      .sort({ displayOrder: 1 });

    const feed = [];
    for (const section of sections) {
      let movies: MovieDocument[];

      if (section.type === SectionType.UPCOMING) {
        // Upcoming section: fetch ALL upcoming content (universal across tabs)
        const upFilter: any = { status: ContentStatus.UPCOMING };
        movies = await this.movieModel
          .find(upFilter)
          .sort({ releaseDate: 1, createdAt: -1 })
          .select('title posterUrl bannerUrl contentType contentRating genres releaseYear duration rating viewCount starRating videoQuality languages releaseDate');

        feed.push({
          id: section._id,
          title: section.title,
          type: section.type,
          slug: section.slug,
          cardSize: section.cardSize,
          showViewMore: section.showViewMore,
          viewMoreText: section.viewMoreText,
          showTrendingNumbers: false,
          bannerImageUrl: null,
          items: movies,
        });
        continue;
      }

      if (section.isSystemManaged) {
        const filter: any = { status: ContentStatus.PUBLISHED };
        // contentTypes (array) takes priority over contentType (single string)
        if ((section as any).contentTypes?.length > 0) {
          filter.contentType = { $in: (section as any).contentTypes };
        } else if (section.contentType) {
          filter.contentType = section.contentType;
        }
        // no filter = all types (Home "Recently Added")
        if (section.genre) filter.genres = section.genre;

        let sort: any = { createdAt: -1 };
        if (section.sortBy === 'popularityScore') sort = { popularityScore: -1, viewCount: -1 };
        if (section.sortBy === 'rating') sort = { rating: -1 };
        if (section.sortBy === 'viewCount') sort = { viewCount: -1 };

        movies = await this.movieModel
          .find(filter)
          .sort(sort)
          .limit(section.maxItems)
          .select('title posterUrl bannerUrl contentType contentRating genres releaseYear duration rating viewCount starRating videoQuality languages');
      } else {
        movies = await this.movieModel
          .find({ _id: { $in: section.contentIds }, status: ContentStatus.PUBLISHED })
          .select('title posterUrl bannerUrl contentType contentRating genres releaseYear duration rating viewCount starRating videoQuality languages');
      }

      // Always include the section, even without movies (show section title at minimum)
      feed.push({
        id: section._id,
        title: section.title,
        type: section.type,
        slug: section.slug,
        cardSize: section.cardSize,
        showViewMore: section.showViewMore,
        viewMoreText: section.viewMoreText,
        showTrendingNumbers: section.showTrendingNumbers,
        bannerImageUrl: section.bannerImageUrl,
        items: movies,
      });
    }

    // Interleave mid-banners between sections
    const sectionTab = filter.section || TabSection.HOME;
    const midBanners = await this.getMidBannersForFeed(sectionTab);
    return this.interleaveMidBanners(feed, midBanners);
  }

  /**
   * Fetch active mid-banners for a given section tab and interleave them into the feed.
   */
  private async getMidBannersForFeed(sectionTab: string): Promise<any[]> {
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
    filter.section = sectionTab || BannerSection.HOME;

    return this.bannerModel
      .find(filter)
      .sort({ displayOrder: 1 })
      .populate('contentId', 'title contentType posterUrl bannerUrl');
  }

  /**
   * Build the final feed with mid-banners interleaved between sections.
   */
  private interleaveMidBanners(feed: any[], midBanners: any[]): any[] {
    if (!midBanners.length) return feed;

    const result = [...feed];
    for (const banner of midBanners) {
      const pos = banner.position || 2; // default: after 2nd section
      const insertAt = Math.min(pos, result.length);
      result.splice(insertAt, 0, {
        id: banner._id,
        title: '',
        type: 'mid_banner',
        slug: null,
        cardSize: 'small',
        showViewMore: false,
        viewMoreText: '',
        showTrendingNumbers: false,
        bannerImageUrl: banner.imageUrl,
        contentId: typeof banner.contentId === 'object' && banner.contentId?._id
          ? String(banner.contentId._id)
          : banner.contentId ? String(banner.contentId) : null,
        items: [],
      });
    }
    return result;
  }

  async getAll(section?: string): Promise<HomeSectionDocument[]> {
    const filter: any = {};
    if (section) filter.section = section;
    return this.sectionModel.find(filter).sort({ displayOrder: 1 });
  }

  async create(data: Partial<HomeSection>): Promise<HomeSectionDocument> {
    if (!data.section) (data as any).section = TabSection.HOME;
    const filter: any = {};
    if (data.section) filter.section = data.section;
    const count = await this.sectionModel.countDocuments(filter);
    return this.sectionModel.create({ ...data, displayOrder: count });
  }

  async update(id: string, data: Partial<HomeSection>): Promise<HomeSectionDocument> {
    const section = await this.sectionModel.findByIdAndUpdate(id, data, { new: true });
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }

  async delete(id: string): Promise<void> {
    const result = await this.sectionModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Section not found');
  }

  async reorder(orderedIds: string[]): Promise<void> {
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { displayOrder: index },
      },
    }));
    await this.sectionModel.bulkWrite(bulkOps);
  }

  async addContent(sectionId: string, movieIds: string[]): Promise<HomeSectionDocument> {
    const section = await this.sectionModel.findById(sectionId);
    if (!section) throw new NotFoundException('Section not found');
    const existingIds = new Set(section.contentIds.map((id) => id.toString()));
    const newIds = movieIds.filter((id) => !existingIds.has(id));
    if (newIds.length > 0) {
      section.contentIds.push(...newIds.map((id) => new Types.ObjectId(id)));
      await section.save();
    }
    return section;
  }

  async removeContent(sectionId: string, movieIds: string[]): Promise<HomeSectionDocument> {
    const section = await this.sectionModel.findById(sectionId);
    if (!section) throw new NotFoundException('Section not found');
    const removeSet = new Set(movieIds);
    section.contentIds = section.contentIds.filter((id) => !removeSet.has(id.toString()));
    await section.save();
    return section;
  }

  /**
   * Idempotently create one "Recently Added" system section per tab
   * (Home / Movies / Shows / Anime). Safe to call multiple times — only
   * creates the sections that are missing.
   */
  async seedRecentlyAdded(): Promise<{ created: number; message: string }> {
    let created = 0;

    for (const def of RECENTLY_ADDED_DEFAULTS) {
      const existing = await this.sectionModel.findOne({ slug: def.slug });
      if (existing) continue;

      // Insert the new system section at displayOrder = 0 and push others down
      await this.sectionModel.updateMany(
        { section: def.section },
        { $inc: { displayOrder: 1 } },
      );

      await this.sectionModel.create({
        slug: def.slug,
        title: def.title,
        section: def.section,
        contentTypes: def.contentTypes,
        type: SectionType.STANDARD,
        cardSize: CardSize.SMALL,
        sortBy: 'createdAt', // newest first
        maxItems: 20,
        isSystemManaged: true,
        isVisible: true,
        showViewMore: true,
        viewMoreText: 'View All',
        showTrendingNumbers: false,
        displayOrder: 0,
        contentIds: [],
      });

      created++;
    }

    // ── Seed Trending sections ──
    for (const def of TRENDING_DEFAULTS) {
      const existing = await this.sectionModel.findOne({ slug: def.slug });
      if (existing) continue;

      // Insert trending at displayOrder = 0 (before everything else) and push others down
      await this.sectionModel.updateMany(
        { section: def.section },
        { $inc: { displayOrder: 1 } },
      );

      await this.sectionModel.create({
        slug: def.slug,
        title: def.title,
        section: def.section,
        contentTypes: def.contentTypes,
        type: SectionType.TRENDING,
        cardSize: CardSize.SMALL,
        sortBy: 'popularityScore',
        maxItems: 10,
        isSystemManaged: true,
        isVisible: true,
        showViewMore: false,
        viewMoreText: '',
        showTrendingNumbers: true,
        displayOrder: 0,
        contentIds: [],
      });

      created++;
    }

    // ── Seed Upcoming sections ──
    for (const def of UPCOMING_DEFAULTS) {
      const existing = await this.sectionModel.findOne({ slug: def.slug });
      if (existing) continue;

      const count = await this.sectionModel.countDocuments({ section: def.section });

      await this.sectionModel.create({
        slug: def.slug,
        title: def.title,
        section: def.section,
        contentTypes: def.contentTypes,
        type: SectionType.UPCOMING,
        cardSize: CardSize.SMALL,
        sortBy: 'releaseDate',
        maxItems: 20,
        isSystemManaged: true,
        isVisible: true,
        showViewMore: true,
        viewMoreText: 'View All',
        showTrendingNumbers: false,
        displayOrder: count,
        contentIds: [],
      });

      created++;
    }

    return {
      created,
      message:
        created > 0
          ? `${created} system section(s) created`
          : 'All default sections already exist',
    };
  }
}
