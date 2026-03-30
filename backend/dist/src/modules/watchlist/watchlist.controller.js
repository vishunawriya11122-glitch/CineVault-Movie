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
exports.WatchlistController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const watchlist_service_1 = require("./watchlist.service");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let WatchlistController = class WatchlistController {
    constructor(watchlistService) {
        this.watchlistService = watchlistService;
    }
    async getWatchlist(userId, profileId) {
        return this.watchlistService.getWatchlist(userId, profileId);
    }
    async add(userId, profileId, contentId) {
        await this.watchlistService.addToWatchlist(userId, profileId, contentId);
        return { message: 'Added to watchlist' };
    }
    async remove(userId, profileId, contentId) {
        await this.watchlistService.removeFromWatchlist(userId, profileId, contentId);
        return { message: 'Removed from watchlist' };
    }
    async check(userId, profileId, contentId) {
        const inWatchlist = await this.watchlistService.isInWatchlist(userId, profileId, contentId);
        return { inWatchlist };
    }
};
exports.WatchlistController = WatchlistController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user watchlist' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Headers)('x-profile-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WatchlistController.prototype, "getWatchlist", null);
__decorate([
    (0, common_1.Post)(':contentId'),
    (0, swagger_1.ApiOperation)({ summary: 'Add to watchlist' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Headers)('x-profile-id')),
    __param(2, (0, common_1.Param)('contentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], WatchlistController.prototype, "add", null);
__decorate([
    (0, common_1.Delete)(':contentId'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove from watchlist' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Headers)('x-profile-id')),
    __param(2, (0, common_1.Param)('contentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], WatchlistController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':contentId/check'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if content is in watchlist' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Headers)('x-profile-id')),
    __param(2, (0, common_1.Param)('contentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], WatchlistController.prototype, "check", null);
exports.WatchlistController = WatchlistController = __decorate([
    (0, swagger_1.ApiTags)('Watchlist'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('watchlist'),
    __metadata("design:paramtypes", [watchlist_service_1.WatchlistService])
], WatchlistController);
//# sourceMappingURL=watchlist.controller.js.map