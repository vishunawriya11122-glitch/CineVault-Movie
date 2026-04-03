import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('r2')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class R2StorageController {
  constructor(private readonly r2: R2StorageService) {}

  // Browse R2 bucket folders/files
  // GET /r2/browse?path=series/breaking-bad/
  @Get('browse')
  async browse(@Query('path') path?: string) {
    return this.r2.browse(path || '');
  }

  // Preview series structure (auto-detect seasons/episodes)
  // GET /r2/preview?path=series/breaking-bad/
  @Get('preview')
  async previewStructure(@Query('path') path: string) {
    return this.r2.previewSeriesStructure(path);
  }

  // Import series from R2 folder into database
  // POST /r2/import/:seriesId { path: "series/breaking-bad/" }
  @Post('import/:seriesId')
  async importSeries(
    @Param('seriesId') seriesId: string,
    @Body() body: { path: string },
  ) {
    return this.r2.importSeriesFromR2(seriesId, body.path);
  }
}
