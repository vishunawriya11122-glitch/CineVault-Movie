import { ContentType, ContentRating, ContentStatus } from '../../../schemas/movie.schema';
declare class CastMemberDto {
    name: string;
    role?: string;
    character?: string;
    photoUrl?: string;
}
declare class StreamingSourceDto {
    label: string;
    url: string;
    quality?: string;
    priority?: number;
}
export declare class CreateMovieDto {
    title: string;
    alternateTitle?: string;
    synopsis: string;
    contentType: ContentType;
    genres: string[];
    languages?: string[];
    contentRating?: ContentRating;
    status?: ContentStatus;
    releaseYear?: number;
    country?: string;
    duration?: number;
    director?: string;
    studio?: string;
    cast?: CastMemberDto[];
    posterUrl?: string;
    bannerUrl?: string;
    logoUrl?: string;
    trailerUrl?: string;
    cbfcCertificateUrl?: string;
    streamingSources?: StreamingSourceDto[];
    imdbId?: string;
    tmdbId?: string;
    tags?: string[];
    platformOrigin?: string;
    scheduledPublishDate?: Date;
    isFeatured?: boolean;
    rankingLabel?: string;
    starRating?: number;
    videoQuality?: string;
}
export {};
