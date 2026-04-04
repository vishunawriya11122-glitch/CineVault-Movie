import {
  Controller,
  Get,
  Post,
  Delete,
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

  // Bucket info
  // GET /r2/info
  @Get('info')
  async getInfo() {
    return this.r2.getBucketInfo();
  }

  // Upload config for multipart uploads (worker URL + API key)
  // GET /r2/upload-config
  @Get('upload-config')
  getUploadConfig() {
    return this.r2.getUploadConfig();
  }

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

  // Get presigned URL for direct upload
  // POST /r2/presigned-url { folder, filename, contentType }
  @Post('presigned-url')
  async getPresignedUrl(
    @Body() body: { folder: string; filename: string; contentType: string },
  ) {
    return this.r2.getPresignedUploadUrl(body.folder, body.filename, body.contentType);
  }

  // Create folder in R2
  // POST /r2/folder { path: "series/naruto/s01/" }
  @Post('folder')
  async createFolder(@Body() body: { path: string }) {
    return this.r2.createFolder(body.path);
  }

  // Delete file from R2
  // DELETE /r2/file?key=series/naruto/s01/e01.mp4
  @Delete('file')
  async deleteFile(@Query('key') key: string) {
    return this.r2.deleteFile(key);
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
