export interface Movie {
  _id: string;
  title: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl?: string;
  trailerUrl?: string;
  genres: string[];
  releaseYear: number;
  duration?: number;
  contentType: 'movie' | 'series' | 'documentary' | 'anime' | 'web_series' | 'tv_show' | 'short_film';
  contentRating?: string;
  status: 'draft' | 'published' | 'archived';
  averageRating: number;
  rating: number;
  totalReviews: number;
  viewCount: number;
  cast: CastMember[];
  streamingSources: StreamingSource[];
  tags: string[];
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
  type: 'hls' | 'dash' | 'mp4';
}

export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  actionType: string;
  contentId?: string;
  isActive: boolean;
  order: number;
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
  totalUsers: number;
  totalContent: number;
  totalViews: number;
  activeToday: number;
  signupChart: { date: string; count: number }[];
  topWatched: { title: string; views: number; id: string }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
