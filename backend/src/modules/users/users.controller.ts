import { Controller, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('userId') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @CurrentUser('userId') userId: string,
    @Body() updates: { name?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateProfile(userId, updates);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete user account permanently' })
  async deleteAccount(@CurrentUser('userId') userId: string) {
    await this.usersService.deleteAccount(userId);
    return { message: 'Account deleted successfully' };
  }

  @Patch('me/fcm-token')
  @ApiOperation({ summary: 'Register FCM token for push notifications' })
  async updateFcmToken(
    @CurrentUser('userId') userId: string,
    @Body('token') token: string,
  ) {
    await this.usersService.updateFcmToken(userId, token);
    return { message: 'FCM token registered' };
  }

  @Get('me/notifications')
  @ApiOperation({ summary: 'Get notifications for current user' })
  async getMyNotifications(
    @CurrentUser('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getUserNotifications(page, limit);
  }
}
