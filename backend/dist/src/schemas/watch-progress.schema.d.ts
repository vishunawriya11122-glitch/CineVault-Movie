import { Document, Types } from 'mongoose';
export type WatchProgressDocument = WatchProgress & Document;
export declare class WatchProgress {
    userId: Types.ObjectId;
    profileId: Types.ObjectId;
    contentId: Types.ObjectId;
    contentType: string;
    seriesId: Types.ObjectId;
    currentTime: number;
    totalDuration: number;
    isCompleted: boolean;
    lastWatchedAt: Date;
    episodeTitle: string;
    contentTitle: string;
    thumbnailUrl: string;
}
export declare const WatchProgressSchema: import("mongoose").Schema<WatchProgress, import("mongoose").Model<WatchProgress, any, any, any, Document<unknown, any, WatchProgress, any, {}> & WatchProgress & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WatchProgress, Document<unknown, {}, import("mongoose").FlatRecord<WatchProgress>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<WatchProgress> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
