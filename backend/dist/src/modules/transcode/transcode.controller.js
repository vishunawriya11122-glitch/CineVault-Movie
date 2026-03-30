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
exports.TranscodeController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const transcode_service_1 = require("./transcode.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
let TranscodeController = class TranscodeController {
    constructor(transcodeService) {
        this.transcodeService = transcodeService;
    }
    async startTranscode(movieId) {
        return this.transcodeService.startTranscode(movieId);
    }
    async getStatus(movieId) {
        return this.transcodeService.getStatus(movieId);
    }
};
exports.TranscodeController = TranscodeController;
__decorate([
    (0, common_1.Post)(':movieId'),
    (0, swagger_1.ApiOperation)({ summary: 'Start HLS transcoding for a movie (Admin)' }),
    __param(0, (0, common_1.Param)('movieId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TranscodeController.prototype, "startTranscode", null);
__decorate([
    (0, common_1.Get)(':movieId/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transcoding status (Admin)' }),
    __param(0, (0, common_1.Param)('movieId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TranscodeController.prototype, "getStatus", null);
exports.TranscodeController = TranscodeController = __decorate([
    (0, swagger_1.ApiTags)('Transcode'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'content_manager'),
    (0, common_1.Controller)('transcode'),
    __metadata("design:paramtypes", [transcode_service_1.TranscodeService])
], TranscodeController);
//# sourceMappingURL=transcode.controller.js.map