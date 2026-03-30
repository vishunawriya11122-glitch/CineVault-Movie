import { MoviesService } from './movies.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { QueryMoviesDto } from './dto/query-movies.dto';
export declare class MoviesController {
    private readonly moviesService;
    constructor(moviesService: MoviesService);
    findAll(query: QueryMoviesDto): Promise<{
        movies: import("../../schemas/movie.schema").MovieDocument[];
        total: number;
        page: number;
        pages: number;
    }>;
    getTrending(limit?: number): Promise<import("../../schemas/movie.schema").MovieDocument[]>;
    getNewReleases(limit?: number): Promise<import("../../schemas/movie.schema").MovieDocument[]>;
    getTopRated(limit?: number): Promise<import("../../schemas/movie.schema").MovieDocument[]>;
    getByGenre(genre: string, limit?: number): Promise<import("../../schemas/movie.schema").MovieDocument[]>;
    getByType(type: string, limit?: number): Promise<import("../../schemas/movie.schema").MovieDocument[]>;
    findById(id: string): Promise<import("../../schemas/movie.schema").MovieDocument>;
    getRelated(id: string): Promise<import("../../schemas/movie.schema").MovieDocument[]>;
    create(dto: CreateMovieDto): Promise<import("../../schemas/movie.schema").MovieDocument>;
    update(id: string, dto: UpdateMovieDto): Promise<import("../../schemas/movie.schema").MovieDocument>;
    delete(id: string): Promise<{
        message: string;
    }>;
}
