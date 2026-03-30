import { Document, Types } from 'mongoose';
export type WatchlistDocument = Watchlist & Document;
export declare class Watchlist {
    userId: Types.ObjectId;
    profileId: Types.ObjectId;
    contentId: Types.ObjectId;
}
export declare const WatchlistSchema: import("mongoose").Schema<Watchlist, import("mongoose").Model<Watchlist, any, any, any, Document<unknown, any, Watchlist, any, {}> & Watchlist & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Watchlist, Document<unknown, {}, import("mongoose").FlatRecord<Watchlist>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Watchlist> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
