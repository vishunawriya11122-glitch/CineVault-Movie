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
exports.SeriesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const series_service_1 = require("./series.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
let SeriesController = class SeriesController {
    constructor(seriesService) {
        this.seriesService = seriesService;
    }
    async getSeasons(seriesId) {
        return this.seriesService.getSeasons(seriesId);
    }
    async getEpisodes(seasonId) {
        return this.seriesService.getEpisodes(seasonId);
    }
    async getEpisode(id) {
        return this.seriesService.getEpisode(id);
    }
    async trackEpisodeView(id, req) {
        const userId = req.user.sub;
        const userEmail = req.user.email;
        const deviceId = req.body?.deviceId;
        const isNew = await this.seriesService.trackEpisodeView(id, userId, userEmail, deviceId);
        return { tracked: isNew };
    }
    async createSeason(seriesId, body) {
        return this.seriesService.createSeason({ ...body, seriesId });
    }
    async updateSeason(id, body) {
        return this.seriesService.updateSeason(id, body);
    }
    async deleteSeason(id) {
        await this.seriesService.deleteSeason(id);
        return { message: 'Season and all episodes deleted' };
    }
    async createEpisode(seasonId, body) {
        return this.seriesService.createEpisode({ ...body, seasonId });
    }
    async createBulkEpisodes(seasonId, body) {
        return this.seriesService.createBulkEpisodes(seasonId, body.episodes);
    }
    async updateEpisode(id, body) {
        return this.seriesService.updateEpisode(id, body);
    }
    async deleteEpisode(id) {
        await this.seriesService.deleteEpisode(id);
        return { message: 'Episode deleted' };
    }
    async generateThumbnails(seasonId) {
        return this.seriesService.generateThumbnailsForSeason(seasonId);
    }
};
exports.SeriesController = SeriesController;
__decorate([
    (0, common_1.Get)(':seriesId/seasons'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all seasons for a series' }),
    __param(0, (0, common_1.Param)('seriesId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "getSeasons", null);
__decorate([
    (0, common_1.Get)('seasons/:seasonId/episodes'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all episodes for a season' }),
    __param(0, (0, common_1.Param)('seasonId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "getEpisodes", null);
__decorate([
    (0, common_1.Get)('episodes/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get episode details' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "getEpisode", null);
__decorate([
    (0, common_1.Post)('episodes/:id/view'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiOperation)({ summary: 'Track a unique view for this episode (1 per user)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "trackEpisodeView", null);
__decorate([
    (0, common_1.Post)(':seriesId/seasons'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a season (Admin)' }),
    __param(0, (0, common_1.Param)('seriesId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "createSeason", null);
__decorate([
    (0, common_1.Patch)('seasons/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a season (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "updateSeason", null);
__decorate([
    (0, common_1.Delete)('seasons/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a season (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "deleteSeason", null);
__decorate([
    (0, common_1.Post)('seasons/:seasonId/episodes'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Create an episode (Admin)' }),
    __param(0, (0, common_1.Param)('seasonId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "createEpisode", null);
__decorate([
    (0, common_1.Post)('seasons/:seasonId/episodes/bulk'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk create episodes (Admin)' }),
    __param(0, (0, common_1.Param)('seasonId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "createBulkEpisodes", null);
__decorate([
    (0, common_1.Patch)('episodes/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an episode (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "updateEpisode", null);
__decorate([
    (0, common_1.Delete)('episodes/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an episode (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "deleteEpisode", null);
__decorate([
    (0, common_1.Post)('seasons/:seasonId/episodes/generate-thumbnails'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Auto-generate Drive thumbnails for all episodes in a season (Admin)' }),
    __param(0, (0, common_1.Param)('seasonId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SeriesController.prototype, "generateThumbnails", null);
exports.SeriesController = SeriesController = __decorate([
    (0, swagger_1.ApiTags)('Series'),
    (0, common_1.Controller)('series'),
    __metadata("design:paramtypes", [series_service_1.SeriesService])
], SeriesController);
//# sourceMappingURL=series.controller.js.map