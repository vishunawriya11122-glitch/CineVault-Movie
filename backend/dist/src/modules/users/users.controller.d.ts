import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(userId: string): Promise<import("../../schemas/user.schema").UserDocument>;
    updateMe(userId: string, updates: {
        name?: string;
        avatarUrl?: string;
    }): Promise<import("../../schemas/user.schema").UserDocument>;
    updateFcmToken(userId: string, token: string): Promise<{
        message: string;
    }>;
}
