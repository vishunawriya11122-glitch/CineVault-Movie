import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { Notification, NotificationSchema } from '../../schemas/notification.schema';
import { Profile, ProfileSchema } from '../../schemas/profile.schema';
import { WatchProgress, WatchProgressSchema } from '../../schemas/watch-progress.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: 'Profile', schema: ProfileSchema },
      { name: 'WatchProgress', schema: WatchProgressSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
