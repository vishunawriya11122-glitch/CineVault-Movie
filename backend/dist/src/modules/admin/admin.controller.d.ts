import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { AdminLog, AdminLogDocument } from '../../schemas/admin-log.schema';
import { WatchProgress, WatchProgressDocument } from '../../schemas/watch-progress.schema';
export declare class AdminController {
    private userModel;
    private adminLogModel;
    private watchProgressModel;
    constructor(userModel: Model<UserDocument>, adminLogModel: Model<AdminLogDocument>, watchProgressModel: Model<WatchProgressDocument>);
    getUsers(page?: number, limit?: number, search?: string): Promise<{
        users: (import("mongoose").Document<unknown, {}, UserDocument, {}, {}> & User & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
    getUser(id: string): Promise<(import("mongoose").Document<unknown, {}, UserDocument, {}, {}> & User & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    suspendUser(id: string, reason: string, admin: any): Promise<(import("mongoose").Document<unknown, {}, UserDocument, {}, {}> & User & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    unsuspendUser(id: string, admin: any): Promise<(import("mongoose").Document<unknown, {}, UserDocument, {}, {}> & User & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    getLogs(page?: number, limit?: number): Promise<{
        logs: (import("mongoose").Document<unknown, {}, AdminLogDocument, {}, {}> & AdminLog & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
    }>;
    getUserWatchHistory(userId: string, page?: number, limit?: number): Promise<{
        items: (import("mongoose").Document<unknown, {}, WatchProgressDocument, {}, {}> & WatchProgress & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
    }>;
}
