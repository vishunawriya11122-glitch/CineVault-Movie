import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BunnyService } from './bunny.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('bunny')
export class BunnyController {
  constructor(private readonly bunnyService: BunnyService) {}

  // ═══ WEBHOOK (no auth — called by Bunny.net) ═════════════════

  @Post('stream/webhook')
  async handleWebhook(@Body() body: { VideoId: string; Status: number; VideoLibraryId: number }) {
    return this.bunnyService.handleWebhook(body);
  }

  // ═══ ADMIN ENDPOINTS (auth required) ══════════════════════════

  // ─── Library Status ──────────────────────────────────────────

  @Get('stream/library')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getLibraryStatus() {
    return this.bunnyService.getLibraryStatus();
  }

  @Get('stream/videos')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async listVideos() {
    return this.bunnyService.listVideos();
  }

  @Get('stream/video/:videoId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getVideoStatus(@Param('videoId') videoId: string) {
    return this.bunnyService.getVideoStatus(videoId);
  }

  // ─── Job / Progress Tracking ─────────────────────────────────

  @Get('stream/jobs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getActiveJobs() {
    return this.bunnyService.getActiveJobs();
  }

  @Get('stream/progress')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getProgress(@Query('jobId') jobId?: string) {
    return this.bunnyService.getProgress(jobId);
  }

  // ─── Movie Upload ────────────────────────────────────────────

  @Post('stream/movie/:movieId/fetch')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async fetchMovieFromUrl(
    @Param('movieId') movieId: string,
    @Body() body: { url?: string },
  ) {
    return this.bunnyService.uploadMovieFromUrl(movieId, body.url);
  }

  @Post('stream/movie/:movieId/upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 * 1024 } }))
  async uploadMovieFile(
    @Param('movieId') movieId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No file provided');
    return this.bunnyService.uploadMovieFromFile(movieId, file.buffer, file.originalname);
  }

  @Get('stream/movie/:movieId/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async checkMovieTranscoding(@Param('movieId') movieId: string) {
    return this.bunnyService.checkMovieTranscoding(movieId);
  }

  // ─── Episode Upload ──────────────────────────────────────────

  @Post('stream/episode/:episodeId/fetch')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async fetchEpisodeFromUrl(
    @Param('episodeId') episodeId: string,
    @Body() body: { url?: string },
  ) {
    return this.bunnyService.uploadEpisodeFromUrl(episodeId, body.url);
  }

  @Post('stream/episode/:episodeId/upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 * 1024 } }))
  async uploadEpisodeFile(
    @Param('episodeId') episodeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No file provided');
    return this.bunnyService.uploadEpisodeFromFile(episodeId, file.buffer, file.originalname);
  }

  // ─── Season / Folder Import (Parallel) ───────────────────────

  @Post('stream/season/:seasonId/import-folder')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async importSeasonFromFolder(
    @Param('seasonId') seasonId: string,
    @Body() body: { folderUrl: string },
  ) {
    return this.bunnyService.importSeasonFromFolder(seasonId, body.folderUrl);
  }

  @Post('stream/season/:seasonId/migrate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async migrateSeasonToBunnyStream(@Param('seasonId') seasonId: string) {
    return this.bunnyService.migrateSeasonToBunnyStream(seasonId);
  }

  @Get('stream/season/:seasonId/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async checkSeasonTranscoding(@Param('seasonId') seasonId: string) {
    return this.bunnyService.checkSeasonTranscoding(seasonId);
  }

  // ─── Bulk Upload Episodes ────────────────────────────────────

  @Post('stream/season/:seasonId/bulk-upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async bulkUploadEpisodes(
    @Param('seasonId') seasonId: string,
    @Body() body: { episodes: { episodeId: string; url: string }[] },
  ) {
    return this.bunnyService.bulkUploadEpisodes(seasonId, body.episodes);
  }

  // ═══ FULL SERIES IMPORT (ONE-CLICK PIPELINE) ═════════════════

  @Post('stream/series/:seriesId/import')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async importFullSeries(
    @Param('seriesId') seriesId: string,
    @Body() body: { folderUrl: string },
  ) {
    return this.bunnyService.importFullSeries(seriesId, body.folderUrl);
  }

  // ─── Collections ─────────────────────────────────────────────

  @Get('stream/collections')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async listCollections() {
    return this.bunnyService.listCollections();
  }
}
