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
exports.WatchProgressService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const watch_progress_schema_1 = require("../../schemas/watch-progress.schema");
let WatchProgressService = class WatchProgressService {
    constructor(progressModel) {
        this.progressModel = progressModel;
    }
    async updateProgress(userId, profileId, data) {
        const isCompleted = data.totalDuration > 0 && (data.currentTime / data.totalDuration) >= 0.85;
        return this.progressModel.findOneAndUpdate({
            userId: new mongoose_2.Types.ObjectId(userId),
            profileId: new mongoose_2.Types.ObjectId(profileId),
            contentId: new mongoose_2.Types.ObjectId(data.contentId),
        }, {
            contentType: data.contentType,
            currentTime: data.currentTime,
            totalDuration: data.totalDuration,
            isCompleted,
            lastWatchedAt: new Date(),
            seriesId: data.seriesId ? new mongoose_2.Types.ObjectId(data.seriesId) : undefined,
            episodeTitle: data.episodeTitle,
            contentTitle: data.contentTitle,
            thumbnailUrl: data.thumbnailUrl,
        }, { upsert: true, new: true });
    }
    async getContinueWatching(userId, profileId, limit = 20) {
        return this.progressModel
            .find({
            userId: new mongoose_2.Types.ObjectId(userId),
            profileId: new mongoose_2.Types.ObjectId(profileId),
            isCompleted: false,
        })
            .sort({ lastWatchedAt: -1 })
            .limit(limit);
    }
    async getWatchHistory(userId, profileId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const filter = {
            userId: new mongoose_2.Types.ObjectId(userId),
            profileId: new mongoose_2.Types.ObjectId(profileId),
        };
        const [items, total] = await Promise.all([
            this.progressModel.find(filter).sort({ lastWatchedAt: -1 }).skip(skip).limit(limit),
            this.progressModel.countDocuments(filter),
        ]);
        return { items, total };
    }
    async getProgress(userId, profileId, contentId) {
        return this.progressModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            profileId: new mongoose_2.Types.ObjectId(profileId),
            contentId: new mongoose_2.Types.ObjectId(contentId),
        });
    }
    async getLatestEpisodeForSeries(userId, profileId, seriesId) {
        const bySeriesId = await this.progressModel
            .findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            profileId: new mongoose_2.Types.ObjectId(profileId),
            seriesId: new mongoose_2.Types.ObjectId(seriesId),
            contentType: 'episode',
        })
            .sort({ lastWatchedAt: -1 });
        return bySeriesId;
    }
    async clearHistory(userId, profileId) {
        await this.progressModel.deleteMany({
            userId: new mongoose_2.Types.ObjectId(userId),
            profileId: new mongoose_2.Types.ObjectId(profileId),
        });
    }
};
exports.WatchProgressService = WatchProgressService;
exports.WatchProgressService = WatchProgressService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(watch_progress_schema_1.WatchProgress.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], WatchProgressService);
//# sourceMappingURL=watch-progress.service.js.map