import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
export declare class UsersService {
    private userModel;
    constructor(userModel: Model<UserDocument>);
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
}
