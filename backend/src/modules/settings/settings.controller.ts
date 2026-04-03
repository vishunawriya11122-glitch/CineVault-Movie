import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import { AppSettings } from './settings.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  getSettings(): Promise<AppSettings> {
    return this.service.getSettings();
  }

  @Put()
  updateSettings(@Body() body: Partial<AppSettings>): Promise<AppSettings> {
    return this.service.updateSettings(body);
  }
}
