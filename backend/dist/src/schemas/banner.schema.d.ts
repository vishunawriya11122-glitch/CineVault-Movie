import { Document, Types } from 'mongoose';
export type BannerDocument = Banner & Document;
export declare enum BannerSection {
    HOME = "home",
    MOVIES = "movies",
    SHOWS = "shows",
    ANIME = "anime"
}
export declare class Banner {
    title: string;
    subtitle: string;
    imageUrl: string;
    contentId: Types.ObjectId;
    actionType: string;
    logoUrl: string;
    tagline: string;
    genreTags: string[];
    displayOrder: number;
    isActive: boolean;
    activeFrom: Date;
    activeTo: Date;
    section: BannerSection;
}
export declare const BannerSchema: import("mongoose").Schema<Banner, import("mongoose").Model<Banner, any, any, any, Document<unknown, any, Banner, any, {}> & Banner & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Banner, Document<unknown, {}, import("mongoose").FlatRecord<Banner>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Banner> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
