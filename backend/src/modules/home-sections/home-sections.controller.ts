import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HomeSectionsService } from './home-sections.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Home Sections')
@Controller('home')
export class HomeSectionsController {
  constructor(private readonly homeSectionsService: HomeSectionsService) {}

  @Get('feed')
  @ApiOperation({ summary: 'Get home feed with all sections and content (filtered by section)' })
  async getFeed(@Query('section') section?: string) {
    return this.homeSectionsService.getHomeFeed(section);
  }

  @Get('sections')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Get all sections (Admin), optionally filtered by section tab' })
  async getAll(@Query('section') section?: string) {
    return this.homeSectionsService.getAll(section);
  }

  @Post('sections')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create a section (Admin)' })
  async create(@Body() body: any) {
    return this.homeSectionsService.create(body);
  }

  @Patch('sections/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update a section (Admin)' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.homeSectionsService.update(id, body);
  }

  @Delete('sections/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete a section (Admin)' })
  async delete(@Param('id') id: string) {
    await this.homeSectionsService.delete(id);
    return { message: 'Section deleted' };
  }

  @Post('sections/reorder')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Reorder sections (Admin)' })
  async reorder(@Body('orderedIds') orderedIds: string[]) {
    await this.homeSectionsService.reorder(orderedIds);
    return { message: 'Sections reordered' };
  }

  @Post('sections/seed-defaults')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Seed default "Recently Added" system sections for all tabs (Admin)' })
  async seedDefaults() {
    return this.homeSectionsService.seedRecentlyAdded();
  }

  @Post('sections/:id/add-content')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Add content to section (Admin)' })
  async addContent(@Param('id') id: string, @Body('movieIds') movieIds: string[]) {
    return this.homeSectionsService.addContent(id, movieIds);
  }

  @Post('sections/:id/remove-content')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Remove content from section (Admin)' })
  async removeContent(@Param('id') id: string, @Body('movieIds') movieIds: string[]) {
    return this.homeSectionsService.removeContent(id, movieIds);
  }
}
