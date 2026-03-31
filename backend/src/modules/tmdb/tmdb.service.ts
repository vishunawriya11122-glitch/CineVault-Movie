import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Movie, MovieDocument, ContentType, ContentStatus } from '../../schemas/movie.schema';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

// Region → TMDB language/region mapping
const REGION_MAP: Record<string, { language: string; region?: string; with_original_language?: string }> = {
  bollywood: { language: 'hi-IN', region: 'IN', with_original_language: 'hi' },
  hollywood: { language: 'en-US', region: 'US', with_original_language: 'en' },
  korean: { language: 'ko-KR', region: 'KR', with_original_language: 'ko' },
  japanese: { language: 'ja-JP', region: 'JP', with_original_language: 'ja' },
  chinese: { language: 'zh-CN', region: 'CN', with_original_language: 'zh' },
  tamil: { language: 'ta-IN', region: 'IN', with_original_language: 'ta' },
  telugu: { language: 'te-IN', region: 'IN', with_original_language: 'te' },
  malayalam: { language: 'ml-IN', region: 'IN', with_original_language: 'ml' },
  kannada: { language: 'kn-IN', region: 'IN', with_original_language: 'kn' },
  thai: { language: 'th-TH', region: 'TH', with_original_language: 'th' },
  spanish: { language: 'es-ES', region: 'ES', with_original_language: 'es' },
  french: { language: 'fr-FR', region: 'FR', with_original_language: 'fr' },
  turkish: { language: 'tr-TR', region: 'TR', with_original_language: 'tr' },
};

// TMDB genre IDs → names
const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

export interface TmdbDiscoverOptions {
  contentType: 'movies' | 'shows' | 'anime' | 'webseries';
  region: string;
  count: number;
  year?: number;
  genres?: number[];
  withLanguage?: string; // dubbed language code e.g. 'hi' for Hindi dubbed
  page?: number; // starting page for fresh results
}

export interface TmdbPreviewItem {
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string;
  rating: number;
  genreNames: string[];
  originalLanguage: string;
  alreadyImported: boolean;
}

@Injectable()
export class TmdbService {
  private accessToken: string;

  constructor(
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    private configService: ConfigService,
  ) {
    this.accessToken = this.configService.get<string>('TMDB_ACCESS_TOKEN', '');
  }

  private async tmdbGet(path: string, params: Record<string, string> = {}): Promise<any> {
    if (!this.accessToken) throw new BadRequestException('TMDB access token not configured');
    const url = new URL(`${TMDB_BASE}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new BadRequestException(`TMDB API error (${res.status}): ${body}`);
    }
    return res.json();
  }

  /** Discover / preview content from TMDB without importing */
  async discover(opts: TmdbDiscoverOptions): Promise<{ items: TmdbPreviewItem[]; nextPage: number }> {
    const { contentType, region, count, year, genres, withLanguage } = opts;
    const regionCfg = REGION_MAP[region.toLowerCase()] ?? { language: 'en-US' };
    const isAnime = contentType === 'anime';
    const mediaType = (contentType === 'movies') ? 'movie' : 'tv';

    // Use startPage so each Discover click gets fresh results
    const startPage = opts.page || 1;
    const pagesNeeded = Math.ceil(count / 20);
    const allResults: any[] = [];

    for (let p = startPage; p < startPage + pagesNeeded && allResults.length < count; p++) {
      const params: Record<string, string> = {
        language: withLanguage ? `${withLanguage}-${regionCfg.region ?? 'US'}` : regionCfg.language,
        sort_by: 'popularity.desc',
        page: String(p),
        'vote_count.gte': '5',
      };

      // Original language filter (unless dubbed mode)
      if (!withLanguage && regionCfg.with_original_language) {
        params.with_original_language = regionCfg.with_original_language;
      }
      if (regionCfg.region && mediaType === 'movie') {
        params.region = regionCfg.region;
      }

      // Anime override
      if (isAnime) {
        params.with_genres = '16';
        if (!withLanguage) params.with_original_language = 'ja';
      }

      // Year filter
      if (year) {
        if (mediaType === 'movie') {
          params.primary_release_year = String(year);
        } else {
          params.first_air_date_year = String(year);
        }
      }

      // Genre filter (multi-select, comma-separated TMDB genre IDs)
      if (genres && genres.length > 0) {
        const existing = params.with_genres ? [params.with_genres] : [];
        params.with_genres = [...existing, ...genres.map(String)].join(',');
      }

      // Dubbed language: find content available in this language
      if (withLanguage) {
        params.with_text_query = ''; // not needed, language param handles translation
      }

      const data = await this.tmdbGet(`/discover/${mediaType}`, params);
      allResults.push(...(data.results ?? []));
    }

    const results = allResults.slice(0, count);
    const nextPage = startPage + pagesNeeded;

    // Check which are already imported
    const tmdbIds = results.map((r: any) => String(r.id));
    const existing = await this.movieModel.find({ tmdbId: { $in: tmdbIds } }).select('tmdbId');
    const existingSet = new Set(existing.map((m) => m.tmdbId));

    return {
      items: results.map((r: any) => ({
        tmdbId: r.id,
        title: r.title ?? r.name ?? '',
        overview: r.overview ?? '',
        posterUrl: r.poster_path ? `${TMDB_IMG}/w500${r.poster_path}` : null,
        backdropUrl: r.backdrop_path ? `${TMDB_IMG}/w1280${r.backdrop_path}` : null,
        releaseDate: r.release_date ?? r.first_air_date ?? '',
        rating: r.vote_average ?? 0,
        genreNames: (r.genre_ids ?? []).map((id: number) => GENRE_MAP[id] ?? 'Other').filter(Boolean),
        originalLanguage: r.original_language ?? '',
        alreadyImported: existingSet.has(String(r.id)),
      })),
      nextPage,
    };
  }

  /** Search TMDB by query string */
  async search(opts: {
    query: string;
    contentType: 'movies' | 'shows' | 'anime' | 'webseries';
    page?: number;
  }): Promise<{ items: TmdbPreviewItem[]; nextPage: number; totalResults: number }> {
    const { query, contentType } = opts;
    const page = opts.page || 1;
    if (!query?.trim()) throw new BadRequestException('Search query is required');

    const mediaType = contentType === 'movies' ? 'movie' : 'tv';
    const params: Record<string, string> = {
      query: query.trim(),
      page: String(page),
      language: 'en-US',
      include_adult: 'false',
    };

    const data = await this.tmdbGet(`/search/${mediaType}`, params);
    let results = data.results ?? [];

    // For anime, filter to animation genre only
    if (contentType === 'anime') {
      results = results.filter((r: any) => (r.genre_ids ?? []).includes(16));
    }

    // Check which are already imported
    const tmdbIds = results.map((r: any) => String(r.id));
    const existing = await this.movieModel.find({ tmdbId: { $in: tmdbIds } }).select('tmdbId');
    const existingSet = new Set(existing.map((m) => m.tmdbId));

    return {
      items: results.map((r: any) => ({
        tmdbId: r.id,
        title: r.title ?? r.name ?? '',
        overview: r.overview ?? '',
        posterUrl: r.poster_path ? `${TMDB_IMG}/w500${r.poster_path}` : null,
        backdropUrl: r.backdrop_path ? `${TMDB_IMG}/w1280${r.backdrop_path}` : null,
        releaseDate: r.release_date ?? r.first_air_date ?? '',
        rating: r.vote_average ?? 0,
        genreNames: (r.genre_ids ?? []).map((id: number) => GENRE_MAP[id] ?? 'Other').filter(Boolean),
        originalLanguage: r.original_language ?? '',
        alreadyImported: existingSet.has(String(r.id)),
      })),
      nextPage: page + 1,
      totalResults: data.total_results ?? 0,
    };
  }

  /** Import selected items from TMDB into the database */
  async importItems(
    tmdbIds: number[],
    contentType: 'movies' | 'shows' | 'anime' | 'webseries',
  ): Promise<{ imported: number; skipped: number; items: any[] }> {
    const mediaType = (contentType === 'movies') ? 'movie' : 'tv';
    let imported = 0;
    let skipped = 0;
    const items: any[] = [];

    for (const tmdbId of tmdbIds) {
      // Duplicate check
      const exists = await this.movieModel.findOne({ tmdbId: String(tmdbId) });
      if (exists) {
        skipped++;
        items.push({ tmdbId, title: exists.title, status: 'skipped', reason: 'already exists' });
        continue;
      }

      try {
        const movie = await this.fetchAndCreateMovie(tmdbId, mediaType, contentType);
        imported++;
        items.push({ tmdbId, title: movie.title, status: 'imported', id: (movie as any)._id });
      } catch (err) {
        skipped++;
        items.push({ tmdbId, status: 'error', reason: err.message });
      }
    }

    return { imported, skipped, items };
  }

  private async fetchAndCreateMovie(
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    contentType: 'movies' | 'shows' | 'anime' | 'webseries',
  ): Promise<MovieDocument> {
    // Fetch full details with credits
    const detail = await this.tmdbGet(`/${mediaType}/${tmdbId}`, {
      language: 'en-US',
      append_to_response: 'credits',
    });

    // Map content type
    let appContentType: ContentType;
    if (contentType === 'anime') {
      appContentType = ContentType.ANIME;
    } else if (contentType === 'webseries') {
      appContentType = ContentType.WEB_SERIES;
    } else if (contentType === 'shows') {
      appContentType = detail.number_of_seasons ? ContentType.WEB_SERIES : ContentType.TV_SHOW;
    } else {
      appContentType = ContentType.MOVIE;
    }

    // Extract genres
    const genres = (detail.genres ?? []).map((g: any) => g.name);

    // Extract languages
    const languages: string[] = [];
    if (detail.original_language) {
      const langMap: Record<string, string> = {
        en: 'English', hi: 'Hindi', ko: 'Korean', ja: 'Japanese', zh: 'Chinese',
        ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', kn: 'Kannada', th: 'Thai',
        es: 'Spanish', fr: 'French', tr: 'Turkish', de: 'German', pt: 'Portuguese',
        it: 'Italian', ru: 'Russian', ar: 'Arabic',
      };
      languages.push(langMap[detail.original_language] ?? detail.original_language);
    }
    if (detail.spoken_languages) {
      for (const sl of detail.spoken_languages) {
        const name = sl.english_name ?? sl.name;
        if (name && !languages.includes(name)) languages.push(name);
      }
    }

    // Extract cast (top 15)
    const credits = detail.credits ?? {};
    const cast = (credits.cast ?? []).slice(0, 15).map((c: any) => ({
      name: c.name,
      character: c.character ?? '',
      role: 'Actor',
      photoUrl: c.profile_path ? `${TMDB_IMG}/w185${c.profile_path}` : '',
    }));

    // Extract director & writers
    const crew = credits.crew ?? [];
    const directors = crew.filter((c: any) => c.job === 'Director').map((c: any) => c.name);
    const writers = crew.filter((c: any) => ['Writer', 'Screenplay', 'Story'].includes(c.job)).map((c: any) => c.name);
    const producers = crew.filter((c: any) => c.job === 'Producer').map((c: any) => c.name);

    // Add director, writers, producers as cast entries with roles
    if (directors.length) {
      cast.push(...directors.map((name: string) => ({
        name, character: '', role: 'Director', photoUrl: '',
      })));
    }
    if (writers.length) {
      cast.push(...writers.slice(0, 3).map((name: string) => ({
        name, character: '', role: 'Writer', photoUrl: '',
      })));
    }
    if (producers.length) {
      cast.push(...producers.slice(0, 3).map((name: string) => ({
        name, character: '', role: 'Producer', photoUrl: '',
      })));
    }

    // Extract year
    const dateStr = detail.release_date ?? detail.first_air_date ?? '';
    const releaseYear = dateStr ? parseInt(dateStr.split('-')[0], 10) : undefined;

    // Duration
    const duration = mediaType === 'movie'
      ? detail.runtime ?? undefined
      : detail.episode_run_time?.[0] ?? undefined;

    // Build movie document
    const movieData: any = {
      title: detail.title ?? detail.name ?? '',
      alternateTitle: detail.original_title ?? detail.original_name ?? '',
      synopsis: detail.overview ?? '',
      contentType: appContentType,
      genres,
      languages,
      status: ContentStatus.PUBLISHED,
      releaseYear,
      country: (detail.production_countries ?? []).map((c: any) => c.name).join(', '),
      duration,
      director: directors.join(', '),
      studio: (detail.production_companies ?? []).map((c: any) => c.name).join(', '),
      cast,
      posterUrl: detail.poster_path ? `${TMDB_IMG}/w500${detail.poster_path}` : '',
      bannerUrl: detail.backdrop_path ? `${TMDB_IMG}/w1280${detail.backdrop_path}` : '',
      tmdbId: String(tmdbId),
      imdbId: detail.imdb_id ?? '',
      rating: detail.vote_average ?? 0,
      starRating: detail.vote_average ? Math.round(detail.vote_average * 10) / 10 : 0,
      voteCount: detail.vote_count ?? 0,
      popularityScore: Math.round(detail.popularity ?? 0),
      tags: (detail.keywords?.keywords ?? detail.keywords?.results ?? []).map((k: any) => k.name).slice(0, 10),
      platformOrigin: 'tmdb',
    };

    return this.movieModel.create(movieData);
  }
}
