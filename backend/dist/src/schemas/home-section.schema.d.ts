import { Document, Types } from 'mongoose';
export type HomeSectionDocument = HomeSection & Document;
export declare enum SectionType {
    STANDARD = "standard",
    LARGE_CARD = "large_card",
    MID_BANNER = "mid_banner",
    TRENDING = "trending"
}
export declare enum CardSize {
    SMALL = "small",
    MEDIUM = "medium",
    LARGE = "large"
}
export declare enum TabSection {
    HOME = "home",
    MOVIES = "movies",
    SHOWS = "shows",
    ANIME = "anime"
}
export declare class HomeSection {
    title: string;
    slug: string;
    type: SectionType;
    contentIds: Types.ObjectId[];
    displayOrder: number;
    isVisible: boolean;
    isSystemManaged: boolean;
    contentType: string;
    genre: string;
    sortBy: string;
    maxItems: number;
    cardSize: CardSize;
    showViewMore: boolean;
    viewMoreText: string;
    bannerImageUrl: string;
    showTrendingNumbers: boolean;
    tags: string[];
    contentTypes: string[];
    section: TabSection;
}
export declare const HomeSectionSchema: import("mongoose").Schema<HomeSection, import("mongoose").Model<HomeSection, any, any, any, Document<unknown, any, HomeSection, any, {}> & HomeSection & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HomeSection, Document<unknown, {}, import("mongoose").FlatRecord<HomeSection>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HomeSection> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
