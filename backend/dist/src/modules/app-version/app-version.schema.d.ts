import { Document } from 'mongoose';
export type AppVersionDocument = AppVersion & Document;
export declare class AppVersion {
    versionCode: number;
    versionName: string;
    forceUpdate: boolean;
    apkUrl: string;
    releaseNotes: string;
}
export declare const AppVersionSchema: import("mongoose").Schema<AppVersion, import("mongoose").Model<AppVersion, any, any, any, Document<unknown, any, AppVersion, any, {}> & AppVersion & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AppVersion, Document<unknown, {}, import("mongoose").FlatRecord<AppVersion>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AppVersion> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
