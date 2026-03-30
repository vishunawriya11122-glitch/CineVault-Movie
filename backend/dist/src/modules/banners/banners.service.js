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
exports.BannersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const banner_schema_1 = require("../../schemas/banner.schema");
const movie_schema_1 = require("../../schemas/movie.schema");
let BannersService = class BannersService {
    constructor(bannerModel, movieModel) {
        this.bannerModel = bannerModel;
        this.movieModel = movieModel;
    }
    async getActiveBanners(section) {
        try {
            const now = new Date();
            const filter = {
                isActive: true,
                $or: [
                    { activeFrom: { $exists: false }, activeTo: { $exists: false } },
                    { activeFrom: { $lte: now }, activeTo: { $gte: now } },
                    { activeFrom: { $lte: now }, activeTo: { $exists: false } },
                    { activeFrom: { $exists: false }, activeTo: { $gte: now } },
                ],
            };
            if (section) {
                filter.section = section;
            }
            else {
                filter.section = banner_schema_1.BannerSection.HOME;
            }
            const banners = await this.bannerModel
                .find(filter)
                .sort({ displayOrder: 1 });
            const validBanners = banners.filter((banner) => {
                if (!banner.contentId)
                    return true;
                const contentIdStr = String(banner.contentId);
                if (contentIdStr.trim() === '')
                    return true;
                try {
                    new mongoose_2.Types.ObjectId(contentIdStr);
                    return true;
                }
                catch {
                    return false;
                }
            });
            const bannersWithContent = validBanners.filter(b => b.contentId);
            const bannersWithoutContent = validBanners.filter(b => !b.contentId);
            if (bannersWithContent.length > 0) {
                await this.bannerModel.populate(bannersWithContent, {
                    path: 'contentId',
                    select: 'title contentType genres contentRating duration releaseYear starRating synopsis posterUrl bannerUrl logoUrl',
                });
            }
            return [...bannersWithContent, ...bannersWithoutContent].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        }
        catch (error) {
            console.error('Error fetching active banners:', error);
            return [];
        }
    }
    async getAll(section) {
        try {
            const filter = {};
            if (section)
                filter.section = section;
            const banners = await this.bannerModel.find(filter).sort({ displayOrder: 1 }).populate('contentId', 'title posterUrl');
            return banners;
        }
        catch (error) {
            console.error('Error fetching all banners with populate:', error);
            const filter = {};
            if (section)
                filter.section = section;
            return this.bannerModel.find(filter).sort({ displayOrder: 1 });
        }
    }
    async create(data) {
        if (!data.section)
            data.section = banner_schema_1.BannerSection.HOME;
        const banner = await this.bannerModel.create(data);
        return banner;
    }
    async update(id, data) {
        const banner = await this.bannerModel.findByIdAndUpdate(id, data, { new: true });
        if (!banner)
            throw new common_1.NotFoundException('Banner not found');
        return banner;
    }
    async delete(id) {
        const result = await this.bannerModel.findByIdAndDelete(id);
        if (!result)
            throw new common_1.NotFoundException('Banner not found');
    }
    async reorder(orderedIds) {
        const bulkOps = orderedIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: { displayOrder: index },
            },
        }));
        await this.bannerModel.bulkWrite(bulkOps);
    }
};
exports.BannersService = BannersService;
exports.BannersService = BannersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(banner_schema_1.Banner.name)),
    __param(1, (0, mongoose_1.InjectModel)(movie_schema_1.Movie.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], BannersService);
//# sourceMappingURL=banners.service.js.map