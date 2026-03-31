import { Model } from 'mongoose';
import { MovieDocument } from '../../schemas/movie.schema';
import { ContentViewDocument } from '../../schemas/content-view.schema';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { QueryMoviesDto } from './dto/query-movies.dto';
export declare class MoviesService {
    private movieModel;
    private contentViewModel;
    constructor(movieModel: Model<MovieDocument>, contentViewModel: Model<ContentViewDocument>);
    create(dto: CreateMovieDto): Promise<MovieDocument>;
    findById(id: string): Promise<MovieDocument>;
    findPublishedById(id: string): Promise<MovieDocument>;
    findByIdAdmin(id: string): Promise<MovieDocument>;
    trackView(movieId: string, userId: string, userEmail?: string, deviceId?: string): Promise<boolean>;
    findAll(query: QueryMoviesDto): Promise<{
        movies: MovieDocument[];
        total: number;
        page: number;
        pages: number;
    }>;
    update(id: string, dto: UpdateMovieDto): Promise<MovieDocument>;
    delete(id: string): Promise<void>;
    getTrending(limit?: number, contentType?: string): Promise<MovieDocument[]>;
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
