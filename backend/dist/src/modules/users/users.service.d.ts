import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { NotificationDocument } from '../../schemas/notification.schema';
import { ProfileDocument } from '../../schemas/profile.schema';
import { WatchProgressDocument } from '../../schemas/watch-progress.schema';
export declare class UsersService {
    private userModel;
    private notificationModel;
    private profileModel;
    private progressModel;
    constructor(userModel: Model<UserDocument>, notificationModel: Model<NotificationDocument>, profileModel: Model<ProfileDocument>, progressModel: Model<WatchProgressDocument>);
    findById(id: string): Promise<UserDocument>;
    findAll(page?: number, limit?: number): Promise<{
        users: UserDocument[];
        total: number;
    }>;
    updateProfile(userId: string, updates: Partial<User>): Promise<UserDocument>;
    suspendUser(userId: string, reason: string): Promise<UserDocument>;
    unsuspendUser(userId: string): Promise<UserDocument>;
    updateFcmToken(userId: string, token: string): Promise<void>;
    removeFcmToken(userId: string, token: string): Promise<void>;
    getStats(): Promise<{
        total: number;
        active: number;
        suspended: number;
    }>;
    deleteAccount(userId: string): Promise<void>;
    getUserNotifications(page?: number, limit?: number): Promise<{
        notifications: NotificationDocument[];
        total: number;
    }>;
}
