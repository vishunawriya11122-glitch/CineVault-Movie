"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const profiles_module_1 = require("./modules/profiles/profiles.module");
const movies_module_1 = require("./modules/movies/movies.module");
const series_module_1 = require("./modules/series/series.module");
const banners_module_1 = require("./modules/banners/banners.module");
const home_sections_module_1 = require("./modules/home-sections/home-sections.module");
const search_module_1 = require("./modules/search/search.module");
const watch_progress_module_1 = require("./modules/watch-progress/watch-progress.module");
const watchlist_module_1 = require("./modules/watchlist/watchlist.module");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const upload_module_1 = require("./modules/upload/upload.module");
const streaming_module_1 = require("./modules/streaming/streaming.module");
const admin_module_1 = require("./modules/admin/admin.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const health_module_1 = require("./modules/health/health.module");
const transcode_module_1 = require("./modules/transcode/transcode.module");
const app_version_module_1 = require("./modules/app-version/app-version.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    uri: configService.get('MONGODB_URI', 'mongodb://localhost:27017/cinevault'),
                }),
                inject: [config_1.ConfigService],
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    throttlers: [
                        {
                            ttl: configService.get('THROTTLE_TTL', 60) * 1000,
                            limit: configService.get('THROTTLE_LIMIT', 100),
                        },
                    ],
                }),
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            profiles_module_1.ProfilesModule,
            movies_module_1.MoviesModule,
            series_module_1.SeriesModule,
            banners_module_1.BannersModule,
            home_sections_module_1.HomeSectionsModule,
            search_module_1.SearchModule,
            watch_progress_module_1.WatchProgressModule,
            watchlist_module_1.WatchlistModule,
            reviews_module_1.ReviewsModule,
            notifications_module_1.NotificationsModule,
            upload_module_1.UploadModule,
            streaming_module_1.StreamingModule,
            admin_module_1.AdminModule,
            analytics_module_1.AnalyticsModule,
            health_module_1.HealthModule,
            transcode_module_1.TranscodeModule,
            app_version_module_1.AppVersionModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map