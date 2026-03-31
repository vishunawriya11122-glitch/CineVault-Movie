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
exports.SeriesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const series_schema_1 = require("../../schemas/series.schema");
const content_view_schema_1 = require("../../schemas/content-view.schema");
function getDriveThumbnailUrl(url) {
    const patterns = [
        /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
        /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
        /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
        /drive\.usercontent\.google\.com\/.*id=([a-zA-Z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
        }
    }
    return null;
}
function autoSetThumbnail(data) {
    if (!data.thumbnailUrl && data.streamingSources?.length) {
        const thumb = getDriveThumbnailUrl(data.streamingSources[0].url);
        if (thumb)
            data.thumbnailUrl = thumb;
    }
    return data;
}
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
function convertStreamingSources(data) {
    if (data.streamingSources && Array.isArray(data.streamingSources)) {
        data.streamingSources = data.streamingSources.map((src) => ({
            ...src,
            url: toDirectDriveUrl(src.url),
        }));
    }
    return data;
}
let SeriesService = class SeriesService {
    constructor(seasonModel, episodeModel, contentViewModel) {
        this.seasonModel = seasonModel;
        this.episodeModel = episodeModel;
        this.contentViewModel = contentViewModel;
    }
    async getSeasons(seriesId) {
        return this.seasonModel.find({
            $or: [
                { seriesId: new mongoose_2.Types.ObjectId(seriesId) },
                { seriesId: seriesId },
            ],
        }).sort({ seasonNumber: 1 });
    }
    async createSeason(data) {
        if (data.seriesId && typeof data.seriesId === 'string') {
            data.seriesId = new mongoose_2.Types.ObjectId(data.seriesId);
        }
        return this.seasonModel.create(data);
    }
    async updateSeason(id, data) {
        const season = await this.seasonModel.findByIdAndUpdate(id, data, { new: true });
        if (!season)
            throw new common_1.NotFoundException('Season not found');
        return season;
    }
    async deleteSeason(id) {
        await this.seasonModel.findByIdAndDelete(id);
        await this.episodeModel.deleteMany({
            $or: [
                { seasonId: new mongoose_2.Types.ObjectId(id) },
                { seasonId: id },
            ],
        });
    }
    async getEpisodes(seasonId) {
        return this.episodeModel.find({
            $or: [
                { seasonId: new mongoose_2.Types.ObjectId(seasonId) },
                { seasonId: seasonId },
            ],
        }).sort({ episodeNumber: 1 });
    }
    async getEpisode(id) {
        const episode = await this.episodeModel.findById(id);
        if (!episode)
            throw new common_1.NotFoundException('Episode not found');
        return episode;
    }
    async createEpisode(data) {
        if (data.seasonId && typeof data.seasonId === 'string') {
            data.seasonId = new mongoose_2.Types.ObjectId(data.seasonId);
        }
        convertStreamingSources(data);
        autoSetThumbnail(data);
        const episode = await this.episodeModel.create(data);
        await this.seasonModel.findByIdAndUpdate(data.seasonId, { $inc: { episodeCount: 1 } });
        return episode;
    }
    async createBulkEpisodes(seasonId, episodes) {
        const lastEpisode = await this.episodeModel
            .findOne({ seasonId: new mongoose_2.Types.ObjectId(seasonId) })
            .sort({ episodeNumber: -1 });
        let nextNumber = (lastEpisode?.episodeNumber ?? 0) + 1;
        const docs = episodes.map((ep) => ({
            ...convertStreamingSources(autoSetThumbnail(ep)),
            seasonId: new mongoose_2.Types.ObjectId(seasonId),
            episodeNumber: ep.episodeNumber ?? nextNumber++,
        }));
        const created = await this.episodeModel.insertMany(docs);
        await this.seasonModel.findByIdAndUpdate(seasonId, { $inc: { episodeCount: created.length } });
        return created;
    }
    async updateEpisode(id, data) {
        convertStreamingSources(data);
        autoSetThumbnail(data);
        const episode = await this.episodeModel.findByIdAndUpdate(id, data, { new: true });
        if (!episode)
            throw new common_1.NotFoundException('Episode not found');
        return episode;
    }
    async deleteEpisode(id) {
        const episode = await this.episodeModel.findByIdAndDelete(id);
        if (episode) {
            await this.seasonModel.findByIdAndUpdate(episode.seasonId, { $inc: { episodeCount: -1 } });
        }
    }
    async generateThumbnailsForSeason(seasonId) {
        const episodes = await this.getEpisodes(seasonId);
        let updated = 0;
        let skipped = 0;
        for (const ep of episodes) {
            if (ep.thumbnailUrl) {
                skipped++;
                continue;
            }
            const sources = ep.streamingSources;
            if (!sources?.length) {
                skipped++;
                continue;
            }
            const thumb = getDriveThumbnailUrl(sources[0].url);
            if (!thumb) {
                skipped++;
                continue;
            }
            await this.episodeModel.findByIdAndUpdate(ep._id, { thumbnailUrl: thumb });
            updated++;
        }
        return { updated, skipped };
    }
    async trackEpisodeView(episodeId, userId, userEmail, deviceId) {
        const episode = await this.episodeModel.findById(episodeId);
        if (!episode)
            throw new common_1.NotFoundException('Episode not found');
        const existing = await this.contentViewModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            contentId: episodeId,
        });
        if (existing)
            return false;
        const season = await this.seasonModel.findById(episode.seasonId);
        await this.contentViewModel.create({
            userId: new mongoose_2.Types.ObjectId(userId),
            contentId: episodeId,
            contentType: 'episode',
            seriesId: season?.seriesId?.toString(),
            seasonId: episode.seasonId?.toString(),
            userEmail,
            deviceId,
        });
        await this.episodeModel.findByIdAndUpdate(episodeId, { $inc: { viewCount: 1 } });
        return true;
    }
};
exports.SeriesService = SeriesService;
exports.SeriesService = SeriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(series_schema_1.Season.name)),
    __param(1, (0, mongoose_1.InjectModel)(series_schema_1.Episode.name)),
    __param(2, (0, mongoose_1.InjectModel)(content_view_schema_1.ContentView.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], SeriesService);
//# sourceMappingURL=series.service.js.map