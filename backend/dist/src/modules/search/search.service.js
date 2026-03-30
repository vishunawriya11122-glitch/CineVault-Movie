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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const movie_schema_1 = require("../../schemas/movie.schema");
let SearchService = class SearchService {
    constructor(movieModel) {
        this.movieModel = movieModel;
    }
    async search(query, filters, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const filter = { status: movie_schema_1.ContentStatus.PUBLISHED };
        if (query && query.trim()) {
            filter.$text = { $search: query };
        }
        if (filters?.contentType)
            filter.contentType = filters.contentType;
        if (filters?.genre)
            filter.genres = filters.genre;
        if (filters?.language)
            filter.languages = filters.language;
        if (filters?.yearMin || filters?.yearMax) {
            filter.releaseYear = {};
            if (filters.yearMin)
                filter.releaseYear.$gte = filters.yearMin;
            if (filters.yearMax)
                filter.releaseYear.$lte = filters.yearMax;
        }
        if (filters?.ratingMin)
            filter.rating = { $gte: filters.ratingMin };
        let sortObj = {};
        if (query && query.trim() && !filters?.sort) {
            sortObj = { score: { $meta: 'textScore' }, popularityScore: -1 };
        }
        else if (filters?.sort === 'rating') {
            sortObj = { rating: -1 };
        }
        else if (filters?.sort === 'newest') {
            sortObj = { releaseYear: -1, createdAt: -1 };
        }
        else if (filters?.sort === 'views') {
            sortObj = { viewCount: -1 };
        }
        else if (filters?.sort === 'title') {
            sortObj = { title: 1 };
        }
        else {
            sortObj = { popularityScore: -1 };
        }
        const projection = query && query.trim()
            ? { score: { $meta: 'textScore' } }
            : {};
        const [results, total] = await Promise.all([
            this.movieModel
                .find(filter, projection)
                .sort(sortObj)
                .skip(skip)
                .limit(limit)
                .select('title posterUrl bannerUrl contentType contentRating genres releaseYear duration rating languages'),
            this.movieModel.countDocuments(filter),
        ]);
        return { results, total };
    }
    async autocomplete(query) {
        if (!query || query.trim().length < 2)
            return [];
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return this.movieModel
            .find({
            status: movie_schema_1.ContentStatus.PUBLISHED,
            title: { $regex: escapedQuery, $options: 'i' },
        })
            .sort({ popularityScore: -1 })
            .limit(10)
            .select('title posterUrl contentType releaseYear');
    }
    async getTrendingSearches() {
        const trending = await this.movieModel
            .find({ status: movie_schema_1.ContentStatus.PUBLISHED })
            .sort({ viewCount: -1 })
            .limit(10)
            .select('title');
        return trending.map((m) => m.title);
    }
    async getGenres() {
        return this.movieModel.distinct('genres', { status: movie_schema_1.ContentStatus.PUBLISHED });
    }
    async getLanguages() {
        return this.movieModel.distinct('languages', { status: movie_schema_1.ContentStatus.PUBLISHED });
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(movie_schema_1.Movie.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], SearchService);
//# sourceMappingURL=search.service.js.map