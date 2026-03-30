import { Document } from 'mongoose';
export type AdminLogDocument = AdminLog & Document;
export declare class AdminLog {
    adminId: string;
    adminEmail: string;
    action: string;
    resource: string;
    resourceId: string;
    details: Record<string, any>;
    ipAddress: string;
}
export declare const AdminLogSchema: import("mongoose").Schema<AdminLog, import("mongoose").Model<AdminLog, any, any, any, Document<unknown, any, AdminLog, any, {}> & AdminLog & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AdminLog, Document<unknown, {}, import("mongoose").FlatRecord<AdminLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AdminLog> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
