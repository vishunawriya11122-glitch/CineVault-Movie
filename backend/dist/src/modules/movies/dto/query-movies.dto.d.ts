import { ContentType, ContentStatus } from '../../../schemas/movie.schema';
export declare class QueryMoviesDto {
    page?: number;
    limit?: number;
    contentType?: ContentType;
    genre?: string;
    language?: string;
    year?: number;
    rating?: number;
    sort?: string;
    status?: ContentStatus;
}
