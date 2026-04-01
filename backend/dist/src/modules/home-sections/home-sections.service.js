"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var HomeSectionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeSectionsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const home_section_schema_1 = require("../../schemas/home-section.schema");
const movie_schema_1 = require("../../schemas/movie.schema");
const RECENTLY_ADDED_DEFAULTS = [
    {
        slug: 'system-recently-added-home',
        title: 'Recently Added',
        section: home_section_schema_1.TabSection.HOME,
        contentTypes: [],
    },
    {
        slug: 'system-recently-added-movies',
        title: 'Recently Added',
        section: home_section_schema_1.TabSection.MOVIES,
        contentTypes: ['movie'],
    },
    {
        slug: 'system-recently-added-shows',
        title: 'Recently Added',
        section: home_section_schema_1.TabSection.SHOWS,
        contentTypes: ['web_series', 'tv_show'],
    },
    {
        slug: 'system-recently-added-anime',
        title: 'Recently Added',
        section: home_section_schema_1.TabSection.ANIME,
        contentTypes: ['anime'],
    },
];
const UPCOMING_DEFAULTS = [
    {
        slug: 'system-upcoming-home',
        title: 'Upcoming',
        section: home_section_schema_1.TabSection.HOME,
        contentTypes: [],
    },
    {
        slug: 'system-upcoming-movies',
        title: 'Upcoming Movies',
        section: home_section_schema_1.TabSection.MOVIES,
        contentTypes: ['movie'],
    },
    {
        slug: 'system-upcoming-shows',
        title: 'Upcoming Shows',
        section: home_section_schema_1.TabSection.SHOWS,
        contentTypes: ['web_series', 'tv_show'],
    },
    {
        slug: 'system-upcoming-anime',
        title: 'Upcoming Anime',
        section: home_section_schema_1.TabSection.ANIME,
        contentTypes: ['anime'],
    },
];
const TRENDING_DEFAULTS = [
    {
        slug: 'system-trending-home',
        title: 'Most Watching \u2022 Trending Now',
        section: home_section_schema_1.TabSection.HOME,
        contentTypes: [],
    },
    {
        slug: 'system-trending-movies',
        title: 'Trending Movies',
        section: home_section_schema_1.TabSection.MOVIES,
        contentTypes: ['movie'],
    },
    {
        slug: 'system-trending-shows',
        title: 'Trending Shows',
        section: home_section_schema_1.TabSection.SHOWS,
        contentTypes: ['web_series', 'tv_show'],
    },
    {
        slug: 'system-trending-anime',
        title: 'Trending Anime',
        section: home_section_schema_1.TabSection.ANIME,
        contentTypes: ['anime'],
    },
];
let HomeSectionsService = HomeSectionsService_1 = class HomeSectionsService {
    constructor(sectionModel, movieModel) {
        this.sectionModel = sectionModel;
        this.movieModel = movieModel;
        this.logger = new common_1.Logger(HomeSectionsService_1.name);
    }
    async onModuleInit() {
        const result = await this.seedRecentlyAdded();
        if (result.created > 0) {
            this.logger.log(result.message);
        }
        await this.autoReleaseUpcoming();
        setInterval(() => this.autoReleaseUpcoming(), 60 * 60 * 1000);
    }
    async autoReleaseUpcoming() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result = await this.movieModel.updateMany({
            status: movie_schema_1.ContentStatus.UPCOMING,
            releaseDate: { $lte: today },
        }, {
            $set: { status: movie_schema_1.ContentStatus.PUBLISHED },
        });
        if (result.modifiedCount > 0) {
            this.logger.log(`Auto-released ${result.modifiedCount} upcoming title(s) to published`);
        }
    }
    async getHomeFeed(section) {
        const filter = { isVisible: true };
        if (section) {
            filter.section = section;
        }
        else {
            filter.section = home_section_schema_1.TabSection.HOME;
        }
        const sections = await this.sectionModel
            .find(filter)
            .sort({ displayOrder: 1 });
        const feed = [];
        for (const section of sections) {
            let movies;
            if (section.type === home_section_schema_1.SectionType.UPCOMING) {
                const upFilter = { status: movie_schema_1.ContentStatus.UPCOMING };
                if (section.contentTypes?.length > 0) {
                    upFilter.contentType = { $in: section.contentTypes };
                }
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
                const filter = { status: movie_schema_1.ContentStatus.PUBLISHED };
                if (section.contentTypes?.length > 0) {
                    filter.contentType = { $in: section.contentTypes };
                }
                else if (section.contentType) {
                    filter.contentType = section.contentType;
                }
                if (section.genre)
                    filter.genres = section.genre;
                let sort = { createdAt: -1 };
                if (section.sortBy === 'popularityScore')
                    sort = { popularityScore: -1, viewCount: -1 };
                if (section.sortBy === 'rating')
                    sort = { rating: -1 };
                if (section.sortBy === 'viewCount')
                    sort = { viewCount: -1 };
                movies = await this.movieModel
                    .find(filter)
                    .sort(sort)
                    .limit(section.maxItems)
                    .select('title posterUrl bannerUrl contentType contentRating genres releaseYear duration rating viewCount starRating videoQuality languages');
            }
            else {
                movies = await this.movieModel
                    .find({ _id: { $in: section.contentIds }, status: movie_schema_1.ContentStatus.PUBLISHED })
                    .select('title posterUrl bannerUrl contentType contentRating genres releaseYear duration rating viewCount starRating videoQuality languages');
            }
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
        return feed;
    }
    async getAll(section) {
        const filter = {};
        if (section)
            filter.section = section;
        return this.sectionModel.find(filter).sort({ displayOrder: 1 });
    }
    async create(data) {
        if (!data.section)
            data.section = home_section_schema_1.TabSection.HOME;
        const filter = {};
        if (data.section)
            filter.section = data.section;
        const count = await this.sectionModel.countDocuments(filter);
        return this.sectionModel.create({ ...data, displayOrder: count });
    }
    async update(id, data) {
        const section = await this.sectionModel.findByIdAndUpdate(id, data, { new: true });
        if (!section)
            throw new common_1.NotFoundException('Section not found');
        return section;
    }
    async delete(id) {
        const result = await this.sectionModel.findByIdAndDelete(id);
        if (!result)
            throw new common_1.NotFoundException('Section not found');
    }
    async reorder(orderedIds) {
        const bulkOps = orderedIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: { displayOrder: index },
            },
        }));
        await this.sectionModel.bulkWrite(bulkOps);
    }
    async addContent(sectionId, movieIds) {
        const section = await this.sectionModel.findById(sectionId);
        if (!section)
            throw new common_1.NotFoundException('Section not found');
        const existingIds = new Set(section.contentIds.map((id) => id.toString()));
        const newIds = movieIds.filter((id) => !existingIds.has(id));
        if (newIds.length > 0) {
            section.contentIds.push(...newIds.map((id) => new mongoose_2.Types.ObjectId(id)));
            await section.save();
        }
        return section;
    }
    async removeContent(sectionId, movieIds) {
        const section = await this.sectionModel.findById(sectionId);
        if (!section)
            throw new common_1.NotFoundException('Section not found');
        const removeSet = new Set(movieIds);
        section.contentIds = section.contentIds.filter((id) => !removeSet.has(id.toString()));
        await section.save();
        return section;
    }
    async seedRecentlyAdded() {
        let created = 0;
        for (const def of RECENTLY_ADDED_DEFAULTS) {
            const existing = await this.sectionModel.findOne({ slug: def.slug });
            if (existing)
                continue;
            await this.sectionModel.updateMany({ section: def.section }, { $inc: { displayOrder: 1 } });
            await this.sectionModel.create({
                slug: def.slug,
                title: def.title,
                section: def.section,
                contentTypes: def.contentTypes,
                type: home_section_schema_1.SectionType.STANDARD,
                cardSize: home_section_schema_1.CardSize.SMALL,
                sortBy: 'createdAt',
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
        for (const def of TRENDING_DEFAULTS) {
            const existing = await this.sectionModel.findOne({ slug: def.slug });
            if (existing)
                continue;
            await this.sectionModel.updateMany({ section: def.section }, { $inc: { displayOrder: 1 } });
            await this.sectionModel.create({
                slug: def.slug,
                title: def.title,
                section: def.section,
                contentTypes: def.contentTypes,
                type: home_section_schema_1.SectionType.TRENDING,
                cardSize: home_section_schema_1.CardSize.SMALL,
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
        for (const def of UPCOMING_DEFAULTS) {
            const existing = await this.sectionModel.findOne({ slug: def.slug });
            if (existing)
                continue;
            const count = await this.sectionModel.countDocuments({ section: def.section });
            await this.sectionModel.create({
                slug: def.slug,
                title: def.title,
                section: def.section,
                contentTypes: def.contentTypes,
                type: home_section_schema_1.SectionType.UPCOMING,
                cardSize: home_section_schema_1.CardSize.SMALL,
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
            message: created > 0
                ? `${created} system section(s) created`
                : 'All default sections already exist',
        };
    }
};
exports.HomeSectionsService = HomeSectionsService;
exports.HomeSectionsService = HomeSectionsService = HomeSectionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(home_section_schema_1.HomeSection.name)),
    __param(1, (0, mongoose_1.InjectModel)(movie_schema_1.Movie.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], HomeSectionsService);
//# sourceMappingURL=home-sections.service.js.map