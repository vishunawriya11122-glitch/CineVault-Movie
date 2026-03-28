import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SeriesService } from './series.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Series')
@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Get(':seriesId/seasons')
  @ApiOperation({ summary: 'Get all seasons for a series' })
  async getSeasons(@Param('seriesId') seriesId: string) {
    return this.seriesService.getSeasons(seriesId);
  }

  @Get('seasons/:seasonId/episodes')
  @ApiOperation({ summary: 'Get all episodes for a season' })
  async getEpisodes(@Param('seasonId') seasonId: string) {
    return this.seriesService.getEpisodes(seasonId);
  }

  @Get('episodes/:id')
  @ApiOperation({ summary: 'Get episode details' })
  async getEpisode(@Param('id') id: string) {
    return this.seriesService.getEpisode(id);
  }

  // Admin
  @Post(':seriesId/seasons')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create a season (Admin)' })
  async createSeason(@Param('seriesId') seriesId: string, @Body() body: any) {
    return this.seriesService.createSeason({ ...body, seriesId });
  }

  @Patch('seasons/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update a season (Admin)' })
  async updateSeason(@Param('id') id: string, @Body() body: any) {
    return this.seriesService.updateSeason(id, body);
  }

  @Delete('seasons/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete a season (Admin)' })
  async deleteSeason(@Param('id') id: string) {
    await this.seriesService.deleteSeason(id);
    return { message: 'Season and all episodes deleted' };
  }

  @Post('seasons/:seasonId/episodes')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create an episode (Admin)' })
  async createEpisode(@Param('seasonId') seasonId: string, @Body() body: any) {
    return this.seriesService.createEpisode({ ...body, seasonId });
  }

  @Post('seasons/:seasonId/episodes/bulk')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Bulk create episodes (Admin)' })
  async createBulkEpisodes(@Param('seasonId') seasonId: string, @Body() body: { episodes: any[] }) {
    return this.seriesService.createBulkEpisodes(seasonId, body.episodes);
  }

  @Patch('episodes/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update an episode (Admin)' })
  async updateEpisode(@Param('id') id: string, @Body() body: any) {
    return this.seriesService.updateEpisode(id, body);
  }

  @Delete('episodes/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete an episode (Admin)' })
  async deleteEpisode(@Param('id') id: string) {
    await this.seriesService.deleteEpisode(id);
    return { message: 'Episode deleted' };
  }

  @Post('seasons/:seasonId/episodes/generate-thumbnails')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Auto-generate Drive thumbnails for all episodes in a season (Admin)' })
  async generateThumbnails(@Param('seasonId') seasonId: string) {
    return this.seriesService.generateThumbnailsForSeason(seasonId);
  }
}
