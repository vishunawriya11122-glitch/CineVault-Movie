import { Document, Types } from 'mongoose';
export type ContentViewDocument = ContentView & Document;
export declare class ContentView {
    userId: Types.ObjectId;
    contentId: string;
    contentType: string;
    seriesId: string;
    seasonId: string;
    deviceId: string;
    userEmail: string;
}
export declare const ContentViewSchema: import("mongoose").Schema<ContentView, import("mongoose").Model<ContentView, any, any, any, Document<unknown, any, ContentView, any, {}> & ContentView & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ContentView, Document<unknown, {}, import("mongoose").FlatRecord<ContentView>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ContentView> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
