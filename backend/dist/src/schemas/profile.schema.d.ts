import { Document, Types } from 'mongoose';
export type ProfileDocument = Profile & Document;
export declare enum MaturityRating {
    G = "G",
    PG = "PG",
    A = "A"
}
export declare class Profile {
    userId: Types.ObjectId;
    displayName: string;
    avatarUrl: string;
    maturityRating: MaturityRating;
    pin: string;
    isActive: boolean;
}
export declare const ProfileSchema: import("mongoose").Schema<Profile, import("mongoose").Model<Profile, any, any, any, Document<unknown, any, Profile, any, {}> & Profile & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Profile, Document<unknown, {}, import("mongoose").FlatRecord<Profile>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Profile> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
