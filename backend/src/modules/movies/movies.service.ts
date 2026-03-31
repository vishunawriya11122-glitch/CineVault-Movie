import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Movie, MovieDocument, ContentStatus } from '../../schemas/movie.schema';
import { ContentView, ContentViewDocument } from '../../schemas/content-view.schema';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { QueryMoviesDto } from './dto/query-movies.dto';

/**
 * Convert any Google Drive sharing link to a direct-download URL that video players can stream.
 * Handles: /file/d/ID/view, /open?id=ID, /uc?id=ID, and already-converted URLs.
 */
function toDirectDriveUrl(url: string): string {
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
    /drive\.usercontent\.google\.com\/.*id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://drive.usercontent.google.com/download?id=${match[1]}&export=download&confirm=t`;
    }
  }
  return url;
}

/** Convert all streaming source URLs in a movie's data (in-place on the Mongoose document). */
function convertMovieStreamingSources(movie: MovieDocument): MovieDocument {
  if (movie.streamingSources && Array.isArray(movie.streamingSources)) {
    movie.streamingSources = movie.streamingSources.map((src: any) => ({
      ...src,
      url: toDirectDriveUrl(src.url),
    })) as any;
  }
  if (movie.trailerUrl) {
    (movie as any).trailerUrl = toDirectDriveUrl(movie.trailerUrl);
  }
  return movie;
}

@Injectable()
export class MoviesService {
  constructor(
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    @InjectModel(ContentView.name) private contentViewModel: Model<ContentViewDocument>,
  ) {}

  async create(dto: CreateMovieDto): Promise<MovieDocument> {
    return this.movieModel.create(dto);
  }

  async findById(id: string): Promise<MovieDocument> {
    const movie = await this.movieModel.findById(id);
    if (!movie) throw new NotFoundException('Content not found');
    return movie;
  }

  async findPublishedById(id: string): Promise<MovieDocument> {
    const movie = await this.movieModel.findOne({
      _id: id,
      status: ContentStatus.PUBLISHED,
    });
    if (!movie) throw new NotFoundException('Content not found');

    // Convert any Google Drive sharing links to direct-download URLs
    return convertMovieStreamingSources(movie);
  }

  /** Admin-only: fetch any movie by ID regardless of status, no view increment */
  async findByIdAdmin(id: string): Promise<MovieDocument> {
    const movie = await this.movieModel.findById(id);
    if (!movie) throw new NotFoundException('Content not found');
    return movie;
  }

  /** Track a unique view per user per movie. Returns true if new view recorded. */
  async trackView(movieId: string, userId: string, userEmail?: string, deviceId?: string): Promise<boolean> {
    const movie = await this.movieModel.findById(movieId);
    if (!movie) throw new NotFoundException('Content not found');

    const existing = await this.contentViewModel.findOne({
      userId: new Types.ObjectId(userId),
      contentId: movieId,
    });
    if (existing) return false; // already viewed

    await this.contentViewModel.create({
      userId: new Types.ObjectId(userId),
      contentId: movieId,
      contentType: 'movie',
      userEmail,
      deviceId,
    });
    await this.movieModel.findByIdAndUpdate(movieId, { $inc: { viewCount: 1 } });
    return true;
  }

  async findAll(query: QueryMoviesDto): Promise<{ movies: MovieDocument[]; total: number; page: number; pages: number }> {
    const { page = 1, limit = 20, contentType, genre, language, year, rating, sort, status } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (contentType) filter.contentType = contentType;
    if (genre) filter.genres = { $in: Array.isArray(genre) ? genre : [genre] };
    if (language) filter.languages = { $in: Array.isArray(language) ? language : [language] };
    if (year) filter.releaseYear = year;
    if (rating) filter.rating = { $gte: rating };

    let sortObj: any = { createdAt: -1 };
    if (sort === 'rating') sortObj = { rating: -1 };
    else if (sort === 'popularity') sortObj = { popularityScore: -1 };
    else if (sort === 'year') sortObj = { releaseYear: -1 };
    else if (sort === 'title') sortObj = { title: 1 };
    else if (sort === 'views') sortObj = { viewCount: -1 };

    const [movies, total] = await Promise.all([
      this.movieModel.find(filter).sort(sortObj).skip(skip).limit(limit),
      this.movieModel.countDocuments(filter),
    ]);

    return { movies, total, page, pages: Math.ceil(total / limit) };
  }

  async update(id: string, dto: UpdateMovieDto): Promise<MovieDocument> {
    const movie = await this.movieModel.findByIdAndUpdate(id, dto, { new: true });
    if (!movie) throw new NotFoundException('Content not found');
    return movie;
  }

  async delete(id: string): Promise<void> {
    const result = await this.movieModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Content not found');
  }

  async getTrending(limit = 20, contentType?: string): Promise<MovieDocument[]> {
    const filter: any = { status: ContentStatus.PUBLISHED };
    if (contentType) {
      // Map tab names to content types
      if (contentType === 'shows') {
        filter.contentType = { $in: ['web_series', 'tv_show'] };
      } else if (contentType === 'anime') {
        filter.contentType = 'anime';
      } else if (contentType === 'movies') {
        filter.contentType = 'movie';
      }
      // 'home' or unrecognized = no filter (all types)
    }
    return this.movieModel
      .find(filter)
      .sort({ popularityScore: -1, viewCount: -1 })
      .limit(limit);
  }

  async getNewReleases(limit = 20): Promise<MovieDocument[]> {
    return this.movieModel
      .find({ status: ContentStatus.PUBLISHED })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getTopRated(limit = 20): Promise<MovieDocument[]> {
    return this.movieModel
      .find({ status: ContentStatus.PUBLISHED, voteCount: { $gte: 5 } })
      .sort({ rating: -1 })
      .limit(limit);
  }

  async getByGenre(genre: string, limit = 20): Promise<MovieDocument[]> {
    return this.movieModel
      .find({ status: ContentStatus.PUBLISHED, genres: genre })
      .sort({ popularityScore: -1 })
      .limit(limit);
  }

  async getByContentType(contentType: string, limit = 20): Promise<MovieDocument[]> {
    return this.movieModel
      .find({ status: ContentStatus.PUBLISHED, contentType })
      .sort({ popularityScore: -1 })
      .limit(limit);
  }

  async getRelated(movieId: string, limit = 12): Promise<MovieDocument[]> {
    const movie = await this.movieModel.findById(movieId);
    if (!movie) return [];

    return this.movieModel
      .find({
        _id: { $ne: movie._id },
        status: ContentStatus.PUBLISHED,
        $or: [
          { genres: { $in: movie.genres } },
          { tags: { $in: movie.tags } },
        ],
      })
      .sort({ popularityScore: -1 })
      .limit(limit);
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.movieModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
  }

  async updateRating(id: string, newRating: number, newVoteCount: number): Promise<void> {
    await this.movieModel.findByIdAndUpdate(id, {
      rating: newRating,
      voteCount: newVoteCount,
    });
  }

  async getStats(): Promise<{ total: number; published: number; draft: number }> {
    const [total, published, draft] = await Promise.all([
      this.movieModel.countDocuments(),
      this.movieModel.countDocuments({ status: ContentStatus.PUBLISHED }),
      this.movieModel.countDocuments({ status: ContentStatus.DRAFT }),
    ]);
    return { total, published, draft };
  }
}
