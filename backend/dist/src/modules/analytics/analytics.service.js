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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../../schemas/user.schema");
const movie_schema_1 = require("../../schemas/movie.schema");
const watch_progress_schema_1 = require("../../schemas/watch-progress.schema");
let AnalyticsService = class AnalyticsService {
    constructor(userModel, movieModel, progressModel) {
        this.userModel = userModel;
        this.movieModel = movieModel;
        this.progressModel = progressModel;
    }
    async getDashboard() {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalUsers, newUsersToday, newUsersMonth, dau, mau, totalContent, topWatched,] = await Promise.all([
            this.userModel.countDocuments(),
            this.userModel.countDocuments({ createdAt: { $gte: dayAgo } }),
            this.userModel.countDocuments({ createdAt: { $gte: monthAgo } }),
            this.userModel.countDocuments({ lastActiveAt: { $gte: dayAgo } }),
            this.userModel.countDocuments({ lastActiveAt: { $gte: monthAgo } }),
            this.movieModel.countDocuments(),
            this.movieModel.find().sort({ viewCount: -1 }).limit(10)
                .select('title viewCount rating posterUrl contentType'),
        ]);
        return {
            users: { total: totalUsers, newToday: newUsersToday, newThisMonth: newUsersMonth, dau, mau },
            content: { total: totalContent },
            topWatched,
        };
    }
    async getUserSignups(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return this.userModel.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }
    async getMostWatched(limit = 20) {
        return this.movieModel
            .find({ status: 'published' })
            .sort({ viewCount: -1 })
            .limit(limit)
            .select('title viewCount rating posterUrl contentType releaseYear');
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(movie_schema_1.Movie.name)),
    __param(2, (0, mongoose_1.InjectModel)(watch_progress_schema_1.WatchProgress.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map