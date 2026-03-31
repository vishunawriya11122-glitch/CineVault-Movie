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
exports.MoviesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const movie_schema_1 = require("../../schemas/movie.schema");
const content_view_schema_1 = require("../../schemas/content-view.schema");
function toDirectDriveUrl(url) {
    const patterns = [
        /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
        /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
        /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
        /drive\.usercontent\.google\.com\/.*id=([a-zA-Z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return `https://drive.usercontent.google.com/download?id=${match[1]}&export=download&confirm=t`;
        }
    }
    return url;
}
function convertMovieStreamingSources(movie) {
    if (movie.streamingSources && Array.isArray(movie.streamingSources)) {
        movie.streamingSources = movie.streamingSources.map((src) => ({
            ...src,
            url: toDirectDriveUrl(src.url),
        }));
    }
    if (movie.trailerUrl) {
        movie.trailerUrl = toDirectDriveUrl(movie.trailerUrl);
    }
    return movie;
}
let MoviesService = class MoviesService {
    constructor(movieModel, contentViewModel) {
        this.movieModel = movieModel;
        this.contentViewModel = contentViewModel;
    }
    async create(dto) {
        return this.movieModel.create(dto);
    }
    async findById(id) {
        const movie = await this.movieModel.findById(id);
        if (!movie)
            throw new common_1.NotFoundException('Content not found');
        return movie;
    }
    async findPublishedById(id) {
        const movie = await this.movieModel.findOne({
            _id: id,
            status: movie_schema_1.ContentStatus.PUBLISHED,
        });
        if (!movie)
            throw new common_1.NotFoundException('Content not found');
        return convertMovieStreamingSources(movie);
    }
    async findByIdAdmin(id) {
        const movie = await this.movieModel.findById(id);
        if (!movie)
            throw new common_1.NotFoundException('Content not found');
        return movie;
    }
    async trackView(movieId, userId, userEmail, deviceId) {
        const movie = await this.movieModel.findById(movieId);
        if (!movie)
            throw new common_1.NotFoundException('Content not found');
        const existing = await this.contentViewModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            contentId: movieId,
        });
        if (existing)
            return false;
        await this.contentViewModel.create({
            userId: new mongoose_2.Types.ObjectId(userId),
            contentId: movieId,
            contentType: 'movie',
            userEmail,
            deviceId,
        });
        await this.movieModel.findByIdAndUpdate(movieId, { $inc: { viewCount: 1 } });
        return true;
    }
    async findAll(query) {
        const { page = 1, limit = 20, contentType, genre, language, year, rating, sort, status } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (contentType)
            filter.contentType = contentType;
        if (genre)
            filter.genres = { $in: Array.isArray(genre) ? genre : [genre] };
        if (language)
            filter.languages = { $in: Array.isArray(language) ? language : [language] };
        if (year)
            filter.releaseYear = year;
        if (rating)
            filter.rating = { $gte: rating };
        let sortObj = { createdAt: -1 };
        if (sort === 'rating')
            sortObj = { rating: -1 };
        else if (sort === 'popularity')
            sortObj = { popularityScore: -1 };
        else if (sort === 'year')
            sortObj = { releaseYear: -1 };
        else if (sort === 'title')
            sortObj = { title: 1 };
        else if (sort === 'views')
            sortObj = { viewCount: -1 };
        const [movies, total] = await Promise.all([
            this.movieModel.find(filter).sort(sortObj).skip(skip).limit(limit),
            this.movieModel.countDocuments(filter),
        ]);
        return { movies, total, page, pages: Math.ceil(total / limit) };
    }
    async update(id, dto) {
        const movie = await this.movieModel.findByIdAndUpdate(id, dto, { new: true });
        if (!movie)
            throw new common_1.NotFoundException('Content not found');
        return movie;
    }
    async delete(id) {
        const result = await this.movieModel.findByIdAndDelete(id);
        if (!result)
            throw new common_1.NotFoundException('Content not found');
    }
    async getTrending(limit = 20, contentType) {
        const filter = { status: movie_schema_1.ContentStatus.PUBLISHED };
        if (contentType) {
            if (contentType === 'shows') {
                filter.contentType = { $in: ['web_series', 'tv_show'] };
            }
            else if (contentType === 'anime') {
                filter.contentType = 'anime';
            }
            else if (contentType === 'movies') {
                filter.contentType = 'movie';
            }
        }
        return this.movieModel
            .find(filter)
            .sort({ popularityScore: -1, viewCount: -1 })
            .limit(limit);
    }
    async getNewReleases(limit = 20) {
        return this.movieModel
            .find({ status: movie_schema_1.ContentStatus.PUBLISHED })
            .sort({ createdAt: -1 })
            .limit(limit);
    }
    async getTopRated(limit = 20) {
        return this.movieModel
            .find({ status: movie_schema_1.ContentStatus.PUBLISHED, voteCount: { $gte: 5 } })
            .sort({ rating: -1 })
            .limit(limit);
    }
    async getByGenre(genre, limit = 20) {
        return this.movieModel
            .find({ status: movie_schema_1.ContentStatus.PUBLISHED, genres: genre })
            .sort({ popularityScore: -1 })
            .limit(limit);
    }
    async getByContentType(contentType, limit = 20) {
        return this.movieModel
            .find({ status: movie_schema_1.ContentStatus.PUBLISHED, contentType })
            .sort({ popularityScore: -1 })
            .limit(limit);
    }
    async getRelated(movieId, limit = 12) {
        const movie = await this.movieModel.findById(movieId);
        if (!movie)
            return [];
        return this.movieModel
            .find({
            _id: { $ne: movie._id },
            status: movie_schema_1.ContentStatus.PUBLISHED,
            $or: [
                { genres: { $in: movie.genres } },
                { tags: { $in: movie.tags } },
            ],
        })
            .sort({ popularityScore: -1 })
            .limit(limit);
    }
    async incrementViewCount(id) {
        await this.movieModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    }
    async updateRating(id, newRating, newVoteCount) {
        await this.movieModel.findByIdAndUpdate(id, {
            rating: newRating,
            voteCount: newVoteCount,
        });
    }
    async getStats() {
        const [total, published, draft] = await Promise.all([
            this.movieModel.countDocuments(),
            this.movieModel.countDocuments({ status: movie_schema_1.ContentStatus.PUBLISHED }),
            this.movieModel.countDocuments({ status: movie_schema_1.ContentStatus.DRAFT }),
        ]);
        return { total, published, draft };
    }
};
exports.MoviesService = MoviesService;
exports.MoviesService = MoviesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(movie_schema_1.Movie.name)),
    __param(1, (0, mongoose_1.InjectModel)(content_view_schema_1.ContentView.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], MoviesService);
//# sourceMappingURL=movies.service.js.map