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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const analytics_service_1 = require("./analytics.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
let AnalyticsController = class AnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getDashboard() {
        return this.analyticsService.getDashboard();
    }
    async getSignups(days) {
        return this.analyticsService.getUserSignups(days);
    }
    async getMostWatched(limit) {
        return this.analyticsService.getMostWatched(limit);
    }
    async getViewAnalytics() {
        return this.analyticsService.getViewAnalytics();
    }
    async getSeriesEpisodeAnalytics(seriesId) {
        return this.analyticsService.getSeriesEpisodeAnalytics(seriesId);
    }
    async getTopSeries(limit) {
        return this.analyticsService.getTopSeries(limit);
    }
    async resetAllViews() {
        return this.analyticsService.resetAllViews();
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get analytics dashboard (Admin)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('signups'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user signup chart data (Admin)' }),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getSignups", null);
__decorate([
    (0, common_1.Get)('most-watched'),
    (0, swagger_1.ApiOperation)({ summary: 'Get most watched content (Admin)' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getMostWatched", null);
__decorate([
    (0, common_1.Get)('views'),
    (0, swagger_1.ApiOperation)({ summary: 'Get view analytics breakdown (Admin)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getViewAnalytics", null);
__decorate([
    (0, common_1.Get)('series/:seriesId/episodes'),
    (0, swagger_1.ApiOperation)({ summary: 'Get episode-level analytics for a series (Admin)' }),
    __param(0, (0, common_1.Param)('seriesId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getSeriesEpisodeAnalytics", null);
__decorate([
    (0, common_1.Get)('top-series'),
    (0, swagger_1.ApiOperation)({ summary: 'Get top series by episode views (Admin)' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getTopSeries", null);
__decorate([
    (0, common_1.Post)('reset-views'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset ALL view counts to zero (Admin)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "resetAllViews", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('Analytics'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map