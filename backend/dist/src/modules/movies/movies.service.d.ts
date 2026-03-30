import { Model } from 'mongoose';
import { MovieDocument } from '../../schemas/movie.schema';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { QueryMoviesDto } from './dto/query-movies.dto';
export declare class MoviesService {
    private movieModel;
    constructor(movieModel: Model<MovieDocument>);
    create(dto: CreateMovieDto): Promise<MovieDocument>;
    findById(id: string): Promise<MovieDocument>;
    findPublishedById(id: string): Promise<MovieDocument>;
    findAll(query: QueryMoviesDto): Promise<{
        movies: MovieDocument[];
        total: number;
        page: number;
        pages: number;
    }>;
    update(id: string, dto: UpdateMovieDto): Promise<MovieDocument>;
    delete(id: string): Promise<void>;
    getTrending(limit?: number): Promise<MovieDocument[]>;
    getNewReleases(limit?: number): Promise<MovieDocument[]>;
    getTopRated(limit?: number): Promise<MovieDocument[]>;
    getByGenre(genre: string, limit?: number): Promise<MovieDocument[]>;
    getByContentType(contentType: string, limit?: number): Promise<MovieDocument[]>;
    getRelated(movieId: string, limit?: number): Promise<MovieDocument[]>;
    incrementViewCount(id: string): Promise<void>;
    updateRating(id: string, newRating: number, newVoteCount: number): Promise<void>;
    getStats(): Promise<{
        total: number;
        published: number;
        draft: number;
    }>;
}
