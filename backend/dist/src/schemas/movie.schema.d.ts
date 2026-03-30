import { Document } from 'mongoose';
export type MovieDocument = Movie & Document;
export declare enum ContentStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    SCHEDULED = "scheduled",
    ARCHIVED = "archived"
}
export declare enum ContentType {
    MOVIE = "movie",
    WEB_SERIES = "web_series",
    TV_SHOW = "tv_show",
    DOCUMENTARY = "documentary",
    SHORT_FILM = "short_film",
    ANIME = "anime"
}
export declare enum ContentRating {
    U = "U",
    UA = "UA",
    A = "A",
    S = "S"
}
export declare class CastMember {
    name: string;
    role: string;
    character: string;
    photoUrl: string;
}
export declare const CastMemberSchema: import("mongoose").Schema<CastMember, import("mongoose").Model<CastMember, any, any, any, Document<unknown, any, CastMember, any, {}> & CastMember & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CastMember, Document<unknown, {}, import("mongoose").FlatRecord<CastMember>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CastMember> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class StreamingSource {
    label: string;
    url: string;
    quality: string;
    priority: number;
}
export declare const StreamingSourceSchema: import("mongoose").Schema<StreamingSource, import("mongoose").Model<StreamingSource, any, any, any, Document<unknown, any, StreamingSource, any, {}> & StreamingSource & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, StreamingSource, Document<unknown, {}, import("mongoose").FlatRecord<StreamingSource>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<StreamingSource> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Movie {
    title: string;
    alternateTitle: string;
    synopsis: string;
    contentType: ContentType;
    genres: string[];
    languages: string[];
    contentRating: ContentRating;
    status: ContentStatus;
    releaseYear: number;
    country: string;
    duration: number;
    director: string;
    studio: string;
    cast: CastMember[];
    posterUrl: string;
    bannerUrl: string;
    logoUrl: string;
    trailerUrl: string;
    cbfcCertificateUrl: string;
    streamingSources: StreamingSource[];
    rating: number;
    starRating: number;
    voteCount: number;
    viewCount: number;
    popularityScore: number;
    imdbId: string;
    tmdbId: string;
    tags: string[];
    platformOrigin: string;
    scheduledPublishDate: Date;
    isFeatured: boolean;
    rankingLabel: string;
    videoQuality: string;
    hlsUrl: string;
    hlsStatus: string;
}
export declare const MovieSchema: import("mongoose").Schema<Movie, import("mongoose").Model<Movie, any, any, any, Document<unknown, any, Movie, any, {}> & Movie & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Movie, Document<unknown, {}, import("mongoose").FlatRecord<Movie>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Movie> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
