export interface Movie {
  _id: string;
  title: string;
  alternateTitle?: string;
  synopsis: string;
  posterUrl: string;
  bannerUrl?: string;
  logoUrl?: string;
  trailerUrl?: string;
  cbfcCertificateUrl?: string;
  genres: string[];
  languages: string[];
  releaseYear: number;
  duration?: number;
  country?: string;
  director?: string;
  studio?: string;
  contentType: 'movie' | 'documentary' | 'anime' | 'web_series' | 'tv_show' | 'short_film';
  contentRating?: string;
  status: 'draft' | 'published' | 'upcoming' | 'archived';
  averageRating: number;
  rating: number;
  starRating: number;
  totalReviews: number;
  viewCount: number;
  cast: CastMember[];
  streamingSources: StreamingSource[];
  tags: string[];
  videoQuality?: string;
  rankingLabel?: string;
  isFeatured?: boolean;
  platformOrigin?: string;
  imdbId?: string;
  tmdbId?: string;
  hlsUrl?: string;
  hlsStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CastMember {
  name: string;
  role: string;
  character?: string;
  photoUrl?: string;
}

export interface StreamingSource {
  quality: string;
  url: string;
  label: string;
}

export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  actionType: string;
  contentId?: any;
  isActive: boolean;
  order: number;
  displayOrder: number;
  section: 'home' | 'movies' | 'shows' | 'anime';
  type?: 'hero' | 'mid';
  position?: number;
  startDate?: string;
  endDate?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  authProvider: string;
  isSuspended: boolean;
  createdAt: string;
  profileCount: number;
}

export interface Review {
  _id: string;
  contentId: string;
  userId: string;
  userName?: string;
  rating: number;
  text: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  contentTitle?: string;
  createdAt: string;
}

export interface Season {
  _id: string;
  seriesId: string;
  seasonNumber: number;
  title: string;
  episodes: Episode[];
}

export interface Episode {
  _id: string;
  episodeNumber: number;
  title: string;
  description: string;
  duration: number;
  thumbnailUrl?: string;
  streamingSources: StreamingSource[];
}

export interface DashboardStats {
  users: { total: number; newToday: number; newThisMonth: number; dau: number; mau: number };
  content: { total: number };
  topWatched: { title: string; viewCount: number; _id: string; rating: number; posterUrl: string; contentType: string }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
