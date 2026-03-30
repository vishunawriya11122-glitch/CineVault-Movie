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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const LATEST_VERSION_CODE = 1;
const LATEST_VERSION_NAME = '1.0.0';
const APK_DOWNLOAD_URL = 'https://github.com/vishu09921202023-ops/Cinevault-App/releases/latest/download/app-release.apk';
let AppController = class AppController {
    root() {
        return {
            message: 'CineVault API',
            version: '1.0.0',
            status: 'running',
            apiBaseUrl: '/api/v1',
            documentation: '/docs',
            endpoints: {
                welcome: '/api/v1',
                health: '/api/v1/health',
                homeFeed: '/api/v1/home/feed',
                banners: '/api/v1/banners',
            },
        };
    }
    getAppVersion() {
        return {
            versionCode: LATEST_VERSION_CODE,
            versionName: LATEST_VERSION_NAME,
            forceUpdate: false,
            apkUrl: APK_DOWNLOAD_URL,
            releaseNotes: 'Latest version of CineVault',
        };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'API Welcome' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "root", null);
__decorate([
    (0, common_1.Get)('app-version'),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest Android app version info' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getAppVersion", null);
exports.AppController = AppController = __decorate([
    (0, swagger_1.ApiTags)('Root'),
    (0, common_1.Controller)()
], AppController);
//# sourceMappingURL=app.controller.js.map