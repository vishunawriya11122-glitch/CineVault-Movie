import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TmdbService, TmdbDiscoverOptions } from './tmdb.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('TMDB')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'content_manager')
@Controller('tmdb')
export class TmdbController {
  constructor(private readonly tmdbService: TmdbService) {}

  @Post('discover')
  @ApiOperation({ summary: 'Discover/preview content from TMDB with filters (Admin)' })
  async discover(@Body() body: TmdbDiscoverOptions) {
    const count = Math.min(body.count || 20, 100);
    return this.tmdbService.discover({ ...body, count });
  }

  @Post('search-person')
  @ApiOperation({ summary: 'Search TMDB for actors/directors by name (Admin)' })
  async searchPerson(@Body() body: { query: string }) {
    return this.tmdbService.searchPerson(body.query);
  }

  @Post('search')
  @ApiOperation({ summary: 'Search TMDB by title/name (Admin)' })
  async search(
    @Body() body: { query: string; contentType: 'movies' | 'shows' | 'anime' | 'webseries'; page?: number },
  ) {
    return this.tmdbService.search(body);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import selected TMDB items into database (Admin)' })
  async importItems(
    @Body() body: { tmdbIds: number[]; contentType: 'movies' | 'shows' | 'anime' | 'webseries' },
  ) {
    if (!body.tmdbIds?.length) return { imported: 0, skipped: 0, items: [] };
    return this.tmdbService.importItems(body.tmdbIds, body.contentType);
  }
}
