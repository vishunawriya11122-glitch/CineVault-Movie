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
exports.WatchlistService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const watchlist_schema_1 = require("../../schemas/watchlist.schema");
let WatchlistService = class WatchlistService {
    constructor(watchlistModel) {
        this.watchlistModel = watchlistModel;
    }
    async addToWatchlist(userId, profileId, contentId) {
        return this.watchlistModel.findOneAndUpdate({
            userId: new mongoose_2.Types.ObjectId(userId),
            profileId: new mongoose_2.Types.ObjectId(profileId),
            contentId: new mongoose_2.Types.ObjectId(contentId),
        }, {}, { upsert: true, new: true });
    }
    async removeFromWatchlist(userId, profileId, contentId) {
        await this.watchlistModel.deleteOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            profileId: new mongoose_2.Types.ObjectId(profileId),
            contentId: new mongoose_2.Types.ObjectId(contentId),
        });
    }
    async getWatchlist(userId, profileId) {
        return this.watchlistModel
            .find({
            userId: new mongoose_2.Types.ObjectId(userId),
            profileId: new mongoose_2.Types.ObjectId(profileId),
        })
            .sort({ createdAt: -1 })
            .populate('contentId', 'title posterUrl bannerUrl contentType contentRating genres releaseYear duration rating');
    }
    async isInWatchlist(userId, profileId, contentId) {
        const item = await this.watchlistModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            profileId: new mongoose_2.Types.ObjectId(profileId),
            contentId: new mongoose_2.Types.ObjectId(contentId),
        });
        return !!item;
    }
};
exports.WatchlistService = WatchlistService;
exports.WatchlistService = WatchlistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(watchlist_schema_1.Watchlist.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], WatchlistService);
//# sourceMappingURL=watchlist.service.js.map