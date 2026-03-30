import { Document, Types } from 'mongoose';
export type UserDocument = User & Document;
export declare enum UserRole {
    USER = "user",
    ADMIN = "admin",
    CONTENT_MANAGER = "content_manager",
    MODERATOR = "moderator"
}
export declare enum AuthProvider {
    LOCAL = "local",
    GOOGLE = "google",
    PHONE = "phone"
}
export declare class User {
    name: string;
    email: string;
    password: string;
    phone: string;
    avatarUrl: string;
    role: UserRole;
    authProvider: AuthProvider;
    googleId: string;
    isEmailVerified: boolean;
    isSuspended: boolean;
    suspendReason: string;
    twoFactorEnabled: boolean;
    twoFactorSecret: string;
    fcmTokens: string[];
    profiles: Types.ObjectId[];
    lastActiveAt: Date;
    deviceInfo: string;
    passwordResetToken: string;
    passwordResetExpires: Date;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User, any, {}> & User & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<User> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
