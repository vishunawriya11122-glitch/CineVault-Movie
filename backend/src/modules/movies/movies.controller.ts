import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MoviesService } from './movies.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { QueryMoviesDto } from './dto/query-movies.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  // Public endpoints
  @Get()
  @ApiOperation({ summary: 'Get movies list with filters' })
  async findAll(@Query() query: QueryMoviesDto) {
    return this.moviesService.findAll(query);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending content (optionally filtered by tab: home, movies, shows, anime)' })
  async getTrending(
    @Query('limit') limit?: number,
    @Query('contentType') contentType?: string,
  ) {
    return this.moviesService.getTrending(limit, contentType);
  }

  @Get('new-releases')
  @ApiOperation({ summary: 'Get new releases' })
  async getNewReleases(@Query('limit') limit?: number) {
    return this.moviesService.getNewReleases(limit);
  }

  @Get('top-rated')
  @ApiOperation({ summary: 'Get top rated movies' })
  async getTopRated(@Query('limit') limit?: number) {
    return this.moviesService.getTopRated(limit);
  }

  @Get('genre/:genre')
  @ApiOperation({ summary: 'Get movies by genre' })
  async getByGenre(@Param('genre') genre: string, @Query('limit') limit?: number) {
    return this.moviesService.getByGenre(genre, limit);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get movies by content type' })
  async getByType(@Param('type') type: string, @Query('limit') limit?: number) {
    return this.moviesService.getByContentType(type, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movie details by ID' })
  async findById(@Param('id') id: string) {
    return this.moviesService.findPublishedById(id);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related movies' })
  async getRelated(@Param('id') id: string) {
    return this.moviesService.getRelated(id);
  }

  // Authenticated view tracking
  @Post(':id/view')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Track a unique view for this movie (1 per user)' })
  async trackView(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub;
    const userEmail = req.user.email;
    const deviceId = req.body?.deviceId;
    const isNew = await this.moviesService.trackView(id, userId, userEmail, deviceId);
    return { tracked: isNew };
  }

  // Admin endpoints
  @Get(':id/admin')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Get movie details for admin (no view increment)' })
  async findByIdAdmin(@Param('id') id: string) {
    return this.moviesService.findByIdAdmin(id);
  }
  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create new movie/show (Admin)' })
  async create(@Body() dto: CreateMovieDto) {
    return this.moviesService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update movie/show (Admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateMovieDto) {
    return this.moviesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete movie/show (Admin)' })
  async delete(@Param('id') id: string) {
    await this.moviesService.delete(id);
    return { message: 'Content deleted' };
  }
}
