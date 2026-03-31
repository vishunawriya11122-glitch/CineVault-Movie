import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { BunnyService } from './bunny.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('bunny')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class BunnyController {
  constructor(private readonly bunnyService: BunnyService) {}

  /** Get all content with Drive URLs that needs migration */
  @Get('pending')
  async getPending() {
    return this.bunnyService.getPendingContent();
  }

  /** Get migration progress */
  @Get('status')
  getStatus() {
    return this.bunnyService.getStatus();
  }

  /** Migrate a single movie */
  @Post('migrate/:movieId')
  async migrateMovie(@Param('movieId') movieId: string) {
    return this.bunnyService.migrateMovie(movieId);
  }

  /** Migrate a single episode */
  @Post('migrate-episode/:episodeId')
  async migrateEpisode(@Param('episodeId') episodeId: string) {
    return this.bunnyService.migrateEpisode(episodeId, '');
  }

  /** Start migrating ALL Drive content to Bunny (runs in background) */
  @Post('migrate-all')
  async migrateAll() {
    await this.bunnyService.migrateAll();
    return { message: 'Migration started', status: this.bunnyService.getStatus() };
  }
}
