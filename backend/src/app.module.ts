import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { MoviesModule } from './modules/movies/movies.module';
import { SeriesModule } from './modules/series/series.module';
import { BannersModule } from './modules/banners/banners.module';
import { HomeSectionsModule } from './modules/home-sections/home-sections.module';
import { SearchModule } from './modules/search/search.module';
import { WatchProgressModule } from './modules/watch-progress/watch-progress.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadModule } from './modules/upload/upload.module';
import { StreamingModule } from './modules/streaming/streaming.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { TranscodeModule } from './modules/transcode/transcode.module';
import { AppVersionModule } from './modules/app-version/app-version.module';
import { TmdbModule } from './modules/tmdb/tmdb.module';
import { GdriveFolderModule } from './modules/gdrive-folder/gdrive-folder.module';
import { BunnyModule } from './modules/bunny/bunny.module';
import { SettingsModule } from './modules/settings/settings.module';
import { R2StorageModule } from './modules/r2-storage/r2-storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/cinevault'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: configService.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ProfilesModule,
    MoviesModule,
    SeriesModule,
    BannersModule,
    HomeSectionsModule,
    SearchModule,
    WatchProgressModule,
    WatchlistModule,
    ReviewsModule,
    NotificationsModule,
    UploadModule,
    StreamingModule,
    AdminModule,
    AnalyticsModule,
    HealthModule,
    TranscodeModule,
    AppVersionModule,
    TmdbModule,
    GdriveFolderModule,
    BunnyModule,
    SettingsModule,
    R2StorageModule,
  ],
})
export class AppModule {}
