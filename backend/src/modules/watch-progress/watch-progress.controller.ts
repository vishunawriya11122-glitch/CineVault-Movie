import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WatchProgressService } from './watch-progress.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Watch Progress')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('watch-progress')
export class WatchProgressController {
  constructor(private readonly watchProgressService: WatchProgressService) {}

  @Post()
  @ApiOperation({ summary: 'Update watch progress (called every 15s during playback)' })
  async updateProgress(
    @CurrentUser('userId') userId: string,
    @Headers('x-profile-id') profileId: string,
    @Body() body: {
      contentId: string;
      contentType: string;
      currentTime: number;
      totalDuration: number;
      seriesId?: string;
      episodeTitle?: string;
      contentTitle?: string;
      thumbnailUrl?: string;
    },
  ) {
    return this.watchProgressService.updateProgress(userId, profileId, body);
  }

  @Get('continue-watching')
  @ApiOperation({ summary: 'Get continue watching list' })
  async getContinueWatching(
    @CurrentUser('userId') userId: string,
    @Headers('x-profile-id') profileId: string,
  ) {
    return this.watchProgressService.getContinueWatching(userId, profileId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get watch history' })
  async getHistory(
    @CurrentUser('userId') userId: string,
    @Headers('x-profile-id') profileId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.watchProgressService.getWatchHistory(userId, profileId, page, limit);
  }

  @Get('latest-for-series/:seriesId')
  @ApiOperation({ summary: 'Get latest episode progress for a series' })
  async getLatestEpisodeForSeries(
    @CurrentUser('userId') userId: string,
    @Headers('x-profile-id') profileId: string,
    @Param('seriesId') seriesId: string,
  ) {
    return this.watchProgressService.getLatestEpisodeForSeries(userId, profileId, seriesId);
  }

  @Get(':contentId')
  @ApiOperation({ summary: 'Get progress for specific content' })
  async getProgress(
    @CurrentUser('userId') userId: string,
    @Headers('x-profile-id') profileId: string,
    @Param('contentId') contentId: string,
  ) {
    return this.watchProgressService.getProgress(userId, profileId, contentId);
  }

  @Delete('history')
  @ApiOperation({ summary: 'Clear watch history' })
  async clearHistory(
    @CurrentUser('userId') userId: string,
    @Headers('x-profile-id') profileId: string,
  ) {
    await this.watchProgressService.clearHistory(userId, profileId);
    return { message: 'Watch history cleared' };
  }
}
