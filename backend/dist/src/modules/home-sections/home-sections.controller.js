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
exports.HomeSectionsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const home_sections_service_1 = require("./home-sections.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
let HomeSectionsController = class HomeSectionsController {
    constructor(homeSectionsService) {
        this.homeSectionsService = homeSectionsService;
    }
    async getFeed(section) {
        return this.homeSectionsService.getHomeFeed(section);
    }
    async getAll(section) {
        return this.homeSectionsService.getAll(section);
    }
    async create(body) {
        return this.homeSectionsService.create(body);
    }
    async update(id, body) {
        return this.homeSectionsService.update(id, body);
    }
    async delete(id) {
        await this.homeSectionsService.delete(id);
        return { message: 'Section deleted' };
    }
    async reorder(orderedIds) {
        await this.homeSectionsService.reorder(orderedIds);
        return { message: 'Sections reordered' };
    }
    async seedDefaults() {
        return this.homeSectionsService.seedRecentlyAdded();
    }
    async addContent(id, movieIds) {
        return this.homeSectionsService.addContent(id, movieIds);
    }
    async removeContent(id, movieIds) {
        return this.homeSectionsService.removeContent(id, movieIds);
    }
};
exports.HomeSectionsController = HomeSectionsController;
__decorate([
    (0, common_1.Get)('feed'),
    (0, swagger_1.ApiOperation)({ summary: 'Get home feed with all sections and content (filtered by section)' }),
    __param(0, (0, common_1.Query)('section')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HomeSectionsController.prototype, "getFeed", null);
__decorate([
    (0, common_1.Get)('sections'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all sections (Admin), optionally filtered by section tab' }),
    __param(0, (0, common_1.Query)('section')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HomeSectionsController.prototype, "getAll", null);
__decorate([
    (0, common_1.Post)('sections'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a section (Admin)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HomeSectionsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('sections/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a section (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HomeSectionsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('sections/:id'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a section (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HomeSectionsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('sections/reorder'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Reorder sections (Admin)' }),
    __param(0, (0, common_1.Body)('orderedIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], HomeSectionsController.prototype, "reorder", null);
__decorate([
    (0, common_1.Post)('sections/seed-defaults'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Seed default "Recently Added" system sections for all tabs (Admin)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HomeSectionsController.prototype, "seedDefaults", null);
__decorate([
    (0, common_1.Post)('sections/:id/add-content'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Add content to section (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('movieIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], HomeSectionsController.prototype, "addContent", null);
__decorate([
    (0, common_1.Post)('sections/:id/remove-content'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove content from section (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('movieIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], HomeSectionsController.prototype, "removeContent", null);
exports.HomeSectionsController = HomeSectionsController = __decorate([
    (0, swagger_1.ApiTags)('Home Sections'),
    (0, common_1.Controller)('home'),
    __metadata("design:paramtypes", [home_sections_service_1.HomeSectionsService])
], HomeSectionsController);
//# sourceMappingURL=home-sections.controller.js.map