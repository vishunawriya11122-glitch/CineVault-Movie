import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search movies, shows, and series' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'contentType', required: false })
  @ApiQuery({ name: 'genre', required: false })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'yearMin', required: false, type: Number })
  @ApiQuery({ name: 'yearMax', required: false, type: Number })
  @ApiQuery({ name: 'ratingMin', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('q') q?: string,
    @Query('contentType') contentType?: string,
    @Query('genre') genre?: string,
    @Query('language') language?: string,
    @Query('yearMin') yearMin?: number,
    @Query('yearMax') yearMax?: number,
    @Query('ratingMin') ratingMin?: number,
    @Query('sort') sort?: string,
    @Query('platform') platform?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.search(
      q ?? '',
      { contentType, genre, language, yearMin, yearMax, ratingMin, sort, platform },
      page,
      limit,
    );
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete search suggestions' })
  async autocomplete(@Query('q') q: string) {
    return this.searchService.autocomplete(q);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending search terms' })
  async trending() {
    return this.searchService.getTrendingSearches();
  }

  @Get('genres')
  @ApiOperation({ summary: 'Get all available genres' })
  async genres() {
    return this.searchService.getGenres();
  }

  @Get('languages')
  @ApiOperation({ summary: 'Get all available languages' })
  async languages() {
    return this.searchService.getLanguages();
  }

  @Get('platforms')
  @ApiOperation({ summary: 'Get all available platforms' })
  async platforms() {
    return this.searchService.getPlatforms();
  }

  @Get('years')
  @ApiOperation({ summary: 'Get all available release years' })
  async years() {
    return this.searchService.getYears();
  }

  @Get('ranking')
  @ApiOperation({ summary: 'Get ranked content by category' })
  @ApiQuery({ name: 'type', required: false, description: 'download or rating' })
  @ApiQuery({ name: 'contentType', required: false })
  @ApiQuery({ name: 'genre', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async ranking(
    @Query('type') type?: string,
    @Query('contentType') contentType?: string,
    @Query('genre') genre?: string,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.getRanking(type, contentType, genre, limit);
  }
}
