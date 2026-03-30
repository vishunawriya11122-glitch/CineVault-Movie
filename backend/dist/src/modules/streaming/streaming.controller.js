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
exports.StreamingController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const streaming_service_1 = require("./streaming.service");
let StreamingController = class StreamingController {
    constructor(streamingService) {
        this.streamingService = streamingService;
    }
    async getStreamUrl(path) {
        return this.streamingService.getSignedStreamUrl(path);
    }
};
exports.StreamingController = StreamingController;
__decorate([
    (0, common_1.Get)('url'),
    (0, swagger_1.ApiOperation)({ summary: 'Get signed streaming URL' }),
    __param(0, (0, common_1.Query)('path')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StreamingController.prototype, "getStreamUrl", null);
exports.StreamingController = StreamingController = __decorate([
    (0, swagger_1.ApiTags)('Streaming'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('streaming'),
    __metadata("design:paramtypes", [streaming_service_1.StreamingService])
], StreamingController);
//# sourceMappingURL=streaming.controller.js.map