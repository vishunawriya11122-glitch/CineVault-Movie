import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(userId: string): Promise<import("../../schemas/user.schema").UserDocument>;
    updateMe(userId: string, updates: {
        name?: string;
        avatarUrl?: string;
    }): Promise<import("../../schemas/user.schema").UserDocument>;
    deleteAccount(userId: string): Promise<{
        message: string;
    }>;
    updateFcmToken(userId: string, token: string): Promise<{
        message: string;
    }>;
    getMyNotifications(userId: string, page?: number, limit?: number): Promise<{
        notifications: import("../../schemas/notification.schema").NotificationDocument[];
        total: number;
    }>;
}
