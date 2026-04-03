import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Movie, MovieDocument, ContentStatus } from '../../schemas/movie.schema';

@Injectable()
export class SearchService {
  constructor(@InjectModel(Movie.name) private movieModel: Model<MovieDocument>) {}

  async search(
    query: string,
    filters?: {
      contentType?: string;
      genre?: string;
      language?: string;
      yearMin?: number;
      yearMax?: number;
      ratingMin?: number;
      sort?: string;
      platform?: string;
    },
    page = 1,
    limit = 20,
  ): Promise<{ results: MovieDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: any = { status: ContentStatus.PUBLISHED };

    if (query && query.trim()) {
      filter.$text = { $search: query };
    }

    if (filters?.contentType) filter.contentType = filters.contentType;
    if (filters?.genre) filter.genres = filters.genre;
    if (filters?.language) filter.languages = filters.language;
    if (filters?.yearMin || filters?.yearMax) {
      filter.releaseYear = {};
      if (filters.yearMin) filter.releaseYear.$gte = filters.yearMin;
      if (filters.yearMax) filter.releaseYear.$lte = filters.yearMax;
    }
    if (filters?.ratingMin) filter.rating = { $gte: filters.ratingMin };
    if (filters?.platform) filter.platformOrigin = { $regex: filters.platform, $options: 'i' };

    let sortObj: any = {};
    if (query && query.trim() && !filters?.sort) {
      sortObj = { score: { $meta: 'textScore' }, popularityScore: -1 };
    } else if (filters?.sort === 'rating') {
      sortObj = { rating: -1 };
    } else if (filters?.sort === 'newest') {
      sortObj = { releaseYear: -1, createdAt: -1 };
    } else if (filters?.sort === 'views') {
      sortObj = { viewCount: -1 };
    } else if (filters?.sort === 'title') {
      sortObj = { title: 1 };
    } else {
      sortObj = { popularityScore: -1 };
    }

    const projection = query && query.trim()
      ? { score: { $meta: 'textScore' } }
      : {};

    const [results, total] = await Promise.all([
      this.movieModel
        .find(filter, projection)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select('title posterUrl bannerUrl contentType contentRating genres releaseYear duration rating languages'),
      this.movieModel.countDocuments(filter),
    ]);

    return { results, total };
  }

  async autocomplete(query: string): Promise<any[]> {
    if (!query || query.trim().length < 2) return [];

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.movieModel
      .find({
        status: ContentStatus.PUBLISHED,
        title: { $regex: escapedQuery, $options: 'i' },
      })
      .sort({ popularityScore: -1 })
      .limit(10)
      .select('title posterUrl contentType releaseYear');
  }

  async getTrendingSearches(): Promise<string[]> {
    // In production, this would be backed by Redis with search query tracking
    const trending = await this.movieModel
      .find({ status: ContentStatus.PUBLISHED })
      .sort({ viewCount: -1 })
      .limit(10)
      .select('title');
    return trending.map((m) => m.title);
  }

  async getGenres(): Promise<string[]> {
    return this.movieModel.distinct('genres', { status: ContentStatus.PUBLISHED });
  }

  async getLanguages(): Promise<string[]> {
    return this.movieModel.distinct('languages', { status: ContentStatus.PUBLISHED });
  }

  async getPlatforms(): Promise<string[]> {
    return this.movieModel.distinct('platformOrigin', {
      status: ContentStatus.PUBLISHED,
      platformOrigin: { $nin: [null, ''] },
    });
  }

  async getYears(): Promise<number[]> {
    const years = await this.movieModel.distinct('releaseYear', {
      status: ContentStatus.PUBLISHED,
      releaseYear: { $ne: null },
    });
    return years.sort((a, b) => b - a);
  }

  async getRanking(
    type = 'download',
    contentType?: string,
    genre?: string,
    limit = 20,
  ): Promise<MovieDocument[]> {
    const filter: any = { status: ContentStatus.PUBLISHED };
    if (contentType) filter.contentType = contentType;
    if (genre) filter.genres = genre;

    let sortObj: any;
    if (type === 'rating') {
      sortObj = { starRating: -1, rating: -1, voteCount: -1 };
    } else {
      // download rank = popularity + views
      sortObj = { popularityScore: -1, viewCount: -1 };
    }

    return this.movieModel
      .find(filter)
      .sort(sortObj)
      .limit(limit)
      .select('title posterUrl bannerUrl contentType contentRating genres releaseYear duration rating starRating languages viewCount popularityScore videoQuality country');
  }
}
