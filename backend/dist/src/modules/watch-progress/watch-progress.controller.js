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
exports.WatchProgressController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const watch_progress_service_1 = require("./watch-progress.service");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let WatchProgressController = class WatchProgressController {
    constructor(watchProgressService) {
        this.watchProgressService = watchProgressService;
    }
    async updateProgress(userId, profileId, body) {
        return this.watchProgressService.updateProgress(userId, profileId, body);
    }
    async getContinueWatching(userId, profileId) {
        return this.watchProgressService.getContinueWatching(userId, profileId);
    }
    async getHistory(userId, profileId, page, limit) {
        return this.watchProgressService.getWatchHistory(userId, profileId, page, limit);
    }
    async getLatestEpisodeForSeries(userId, profileId, seriesId) {
        return this.watchProgressService.getLatestEpisodeForSeries(userId, profileId, seriesId);
    }
    async getProgress(userId, profileId, contentId) {
        return this.watchProgressService.getProgress(userId, profileId, contentId);
    }
    async clearHistory(userId, profileId) {
        await this.watchProgressService.clearHistory(userId, profileId);
        return { message: 'Watch history cleared' };
    }
    async deleteHistoryItem(userId, id) {
        await this.watchProgressService.deleteHistoryItem(userId, id);
        return { message: 'History item deleted' };
    }
};
exports.WatchProgressController = WatchProgressController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update watch progress (called every 15s during playback)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Headers)('x-profile-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WatchProgressController.prototype, "updateProgress", null);
__decorate([
    (0, common_1.Get)('continue-watching'),
    (0, swagger_1.ApiOperation)({ summary: 'Get continue watching list' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Headers)('x-profile-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WatchProgressController.prototype, "getContinueWatching", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get watch history' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Headers)('x-profile-id')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], WatchProgressController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('latest-for-series/:seriesId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest episode progress for a series' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Headers)('x-profile-id')),
    __param(2, (0, common_1.Param)('seriesId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], WatchProgressController.prototype, "getLatestEpisodeForSeries", null);
__decorate([
    (0, common_1.Get)(':contentId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get progress for specific content' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Headers)('x-profile-id')),
    __param(2, (0, common_1.Param)('contentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], WatchProgressController.prototype, "getProgress", null);
__decorate([
    (0, common_1.Delete)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'Clear watch history' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Headers)('x-profile-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WatchProgressController.prototype, "clearHistory", null);
__decorate([
    (0, common_1.Delete)('history/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a single watch history item' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WatchProgressController.prototype, "deleteHistoryItem", null);
exports.WatchProgressController = WatchProgressController = __decorate([
    (0, swagger_1.ApiTags)('Watch Progress'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('watch-progress'),
    __metadata("design:paramtypes", [watch_progress_service_1.WatchProgressService])
], WatchProgressController);
//# sourceMappingURL=watch-progress.controller.js.map