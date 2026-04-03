import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @ApiOperation({ summary: 'Get active banners for hero carousel (filtered by section)' })
  async getActive(@Query('section') section?: string) {
    return this.bannersService.getActiveBanners(section);
  }

  @Get('mid')
  @ApiOperation({ summary: 'Get active mid-banners (filtered by section)' })
  async getMidBanners(@Query('section') section?: string) {
    return this.bannersService.getMidBanners(section);
  }

  @Get('all')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Get all banners (Admin), optionally filtered by section' })
  async getAll(@Query('section') section?: string) {
    return this.bannersService.getAll(section);
  }

  @Get('test-urls')
  @ApiOperation({ summary: 'Test endpoint - Get all banner image URLs' })
  async getTestUrls() {
    const banners = await this.bannersService.getAll();
    return banners.map((b: any) => ({
      id: b._id,
      title: b.title,
      imageUrl: b.imageUrl,
      imageUrlType: typeof b.imageUrl,
      imageUrlLength: b.imageUrl?.length || 0,
    }));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create banner (Admin)' })
  async create(@Body() body: any) {
    return this.bannersService.create(body);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update banner (Admin)' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.bannersService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Delete banner (Admin)' })
  async delete(@Param('id') id: string) {
    await this.bannersService.delete(id);
    return { message: 'Banner deleted' };
  }

  @Post('reorder')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Reorder banners (Admin)' })
  async reorder(@Body('orderedIds') orderedIds: string[]) {
    await this.bannersService.reorder(orderedIds);
    return { message: 'Banners reordered' };
  }
}
