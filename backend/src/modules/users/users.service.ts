import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Notification, NotificationDocument } from '../../schemas/notification.schema';
import { Profile, ProfileDocument } from '../../schemas/profile.schema';
import { WatchProgress, WatchProgressDocument } from '../../schemas/watch-progress.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel('Profile') private profileModel: Model<ProfileDocument>,
    @InjectModel('WatchProgress') private progressModel: Model<WatchProgressDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(page = 1, limit = 20): Promise<{ users: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.userModel.countDocuments(),
    ]);
    return { users, total };
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async suspendUser(userId: string, reason: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { isSuspended: true, suspendReason: reason },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async unsuspendUser(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { isSuspended: false, suspendReason: null },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateFcmToken(userId: string, token: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $addToSet: { fcmTokens: token },
    });
  }

  async removeFcmToken(userId: string, token: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: token },
    });
  }

  async getStats(): Promise<{ total: number; active: number; suspended: number }> {
    const [total, suspended] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isSuspended: true }),
    ]);
    return { total, active: total - suspended, suspended };
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Delete all related data
    await Promise.all([
      this.profileModel.deleteMany({ userId: new Types.ObjectId(userId) }),
      this.progressModel.deleteMany({ userId: new Types.ObjectId(userId) }),
      this.userModel.findByIdAndDelete(userId),
    ]);
  }

  async getUserNotifications(page = 1, limit = 20): Promise<{ notifications: NotificationDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter = { isSent: true, targetAudience: 'all' };
    const [notifications, total] = await Promise.all([
      this.notificationModel.find(filter).sort({ sentAt: -1 }).skip(skip).limit(limit),
      this.notificationModel.countDocuments(filter),
    ]);
    return { notifications, total };
  }
}
