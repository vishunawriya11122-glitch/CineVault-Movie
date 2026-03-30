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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const review_schema_1 = require("../../schemas/review.schema");
const movie_schema_1 = require("../../schemas/movie.schema");
let ReviewsService = class ReviewsService {
    constructor(reviewModel, movieModel) {
        this.reviewModel = reviewModel;
        this.movieModel = movieModel;
    }
    async createReview(userId, contentId, rating, text) {
        const existing = await this.reviewModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            contentId: new mongoose_2.Types.ObjectId(contentId),
        });
        if (existing)
            throw new common_1.ConflictException('You have already reviewed this content');
        const review = await this.reviewModel.create({
            userId: new mongoose_2.Types.ObjectId(userId),
            contentId: new mongoose_2.Types.ObjectId(contentId),
            rating,
            text,
        });
        await this.recalculateRating(contentId);
        return review;
    }
    async getReviews(contentId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const filter = {
            contentId: new mongoose_2.Types.ObjectId(contentId),
            moderationStatus: review_schema_1.ModerationStatus.APPROVED,
        };
        const [reviews, total] = await Promise.all([
            this.reviewModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name avatarUrl'),
            this.reviewModel.countDocuments(filter),
        ]);
        return { reviews, total };
    }
    async getAllReviews(page = 1, limit = 50, status) {
        const skip = (page - 1) * limit;
        const filter = {};
        if (status)
            filter.moderationStatus = status;
        const [reviews, total] = await Promise.all([
            this.reviewModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
                .populate('userId', 'name email')
                .populate('contentId', 'title'),
            this.reviewModel.countDocuments(filter),
        ]);
        return { reviews, total };
    }
    async moderateReview(reviewId, status, moderatorId) {
        const review = await this.reviewModel.findByIdAndUpdate(reviewId, { moderationStatus: status, moderatedBy: moderatorId, moderatedAt: new Date() }, { new: true });
        if (!review)
            throw new common_1.NotFoundException('Review not found');
        return review;
    }
    async deleteReview(reviewId) {
        const review = await this.reviewModel.findByIdAndDelete(reviewId);
        if (!review)
            throw new common_1.NotFoundException('Review not found');
        await this.recalculateRating(review.contentId.toString());
    }
    async recalculateRating(contentId) {
        const result = await this.reviewModel.aggregate([
            { $match: { contentId: new mongoose_2.Types.ObjectId(contentId), moderationStatus: review_schema_1.ModerationStatus.APPROVED } },
            { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]);
        const avgRating = result[0]?.avgRating || 0;
        const count = result[0]?.count || 0;
        await this.movieModel.findByIdAndUpdate(contentId, {
            rating: Math.round(avgRating * 10) / 10,
            voteCount: count,
        });
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(review_schema_1.Review.name)),
    __param(1, (0, mongoose_1.InjectModel)(movie_schema_1.Movie.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map