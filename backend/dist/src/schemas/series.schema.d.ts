import { Document, Types } from 'mongoose';
import { StreamingSource } from './movie.schema';
export type SeasonDocument = Season & Document;
export type EpisodeDocument = Episode & Document;
export declare class SkipTimestamp {
    start: number;
    end: number;
}
export declare const SkipTimestampSchema: import("mongoose").Schema<SkipTimestamp, import("mongoose").Model<SkipTimestamp, any, any, any, Document<unknown, any, SkipTimestamp, any, {}> & SkipTimestamp & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SkipTimestamp, Document<unknown, {}, import("mongoose").FlatRecord<SkipTimestamp>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SkipTimestamp> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class SubtitleTrack {
    language: string;
    url: string;
    isDefault: boolean;
}
export declare const SubtitleTrackSchema: import("mongoose").Schema<SubtitleTrack, import("mongoose").Model<SubtitleTrack, any, any, any, Document<unknown, any, SubtitleTrack, any, {}> & SubtitleTrack & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SubtitleTrack, Document<unknown, {}, import("mongoose").FlatRecord<SubtitleTrack>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<SubtitleTrack> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class AudioTrack {
    language: string;
    label: string;
    isDefault: boolean;
}
export declare const AudioTrackSchema: import("mongoose").Schema<AudioTrack, import("mongoose").Model<AudioTrack, any, any, any, Document<unknown, any, AudioTrack, any, {}> & AudioTrack & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AudioTrack, Document<unknown, {}, import("mongoose").FlatRecord<AudioTrack>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<AudioTrack> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Episode {
    seasonId: Types.ObjectId;
    episodeNumber: number;
    title: string;
    synopsis: string;
    duration: number;
    airDate: Date;
    thumbnailUrl: string;
    streamingSources: StreamingSource[];
    skipIntro: SkipTimestamp;
    skipRecap: SkipTimestamp;
    subtitles: SubtitleTrack[];
    audioTracks: AudioTrack[];
    viewCount: number;
}
export declare const EpisodeSchema: import("mongoose").Schema<Episode, import("mongoose").Model<Episode, any, any, any, Document<unknown, any, Episode, any, {}> & Episode & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Episode, Document<unknown, {}, import("mongoose").FlatRecord<Episode>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Episode> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Season {
    seriesId: Types.ObjectId;
    seasonNumber: number;
    title: string;
    synopsis: string;
    posterUrl: string;
    releaseYear: number;
    episodeCount: number;
}
export declare const SeasonSchema: import("mongoose").Schema<Season, import("mongoose").Model<Season, any, any, any, Document<unknown, any, Season, any, {}> & Season & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Season, Document<unknown, {}, import("mongoose").FlatRecord<Season>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Season> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
