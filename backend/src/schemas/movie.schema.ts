import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MovieDocument = Movie & Document;

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  ARCHIVED = 'archived',
}

export enum ContentType {
  MOVIE = 'movie',
  WEB_SERIES = 'web_series',
  TV_SHOW = 'tv_show',
  DOCUMENTARY = 'documentary',
  SHORT_FILM = 'short_film',
  ANIME = 'anime',
}

export enum ContentRating {
  U = 'U',
  UA = 'UA',
  A = 'A',
  S = 'S',
}

@Schema({ _id: false })
export class CastMember {
  @Prop({ required: true })
  name: string;

  @Prop()
  role: string;

  @Prop()
  character: string;

  @Prop()
  photoUrl: string;
}

export const CastMemberSchema = SchemaFactory.createForClass(CastMember);

@Schema({ _id: false })
export class StreamingSource {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  quality: string;

  @Prop({ default: 0 })
  priority: number;
}

export const StreamingSourceSchema = SchemaFactory.createForClass(StreamingSource);

@Schema({ timestamps: true })
export class Movie {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop()
  alternateTitle: string;

  @Prop({ required: true })
  synopsis: string;

  @Prop({ type: String, enum: ContentType, required: true })
  contentType: ContentType;

  @Prop([String])
  genres: string[];

  @Prop([String])
  languages: string[];

  @Prop({ type: String, enum: ContentRating, default: ContentRating.UA })
  contentRating: ContentRating;

  @Prop({ type: String, enum: ContentStatus, default: ContentStatus.DRAFT })
  status: ContentStatus;

  @Prop()
  releaseYear: number;

  @Prop()
  country: string;

  @Prop()
  duration: number; // minutes

  @Prop()
  director: string;

  @Prop()
  studio: string;

  @Prop({ type: [CastMemberSchema] })
  cast: CastMember[];

  @Prop()
  posterUrl: string; // 2:3

  @Prop()
  bannerUrl: string; // 16:9

  @Prop()
  logoUrl: string; // transparent PNG

  @Prop()
  trailerUrl: string;

  @Prop()
  cbfcCertificateUrl: string;

  @Prop({ type: [StreamingSourceSchema] })
  streamingSources: StreamingSource[];

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0, min: 0, max: 10 })
  starRating: number; // Admin-set star rating (0-10, e.g. 8.2)

  @Prop({ default: 0 })
  voteCount: number;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  popularityScore: number;

  @Prop()
  imdbId: string;

  @Prop()
  tmdbId: string;

  @Prop([String])
  tags: string[];

  @Prop()
  platformOrigin: string;

  @Prop()
  scheduledPublishDate: Date;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop()
  rankingLabel: string; // e.g., "Thriller #3 in India Today"

  @Prop()
  videoQuality: string; // e.g., HD, FHD, 4K, UHD, HDTS, CAM

  @Prop()
  hlsUrl: string; // HLS master.m3u8 URL for adaptive streaming

  @Prop({ default: 'none' })
  hlsStatus: string; // none, processing, completed, failed

  @Prop()
  driveFolderUrl: string; // Google Drive folder link for auto-indexing episodes
}

export const MovieSchema = SchemaFactory.createForClass(Movie);
MovieSchema.index({ title: 'text', alternateTitle: 'text', synopsis: 'text' });
MovieSchema.index({ status: 1 });
MovieSchema.index({ contentType: 1 });
MovieSchema.index({ genres: 1 });
MovieSchema.index({ languages: 1 });
MovieSchema.index({ releaseYear: -1 });
MovieSchema.index({ popularityScore: -1 });
MovieSchema.index({ rating: -1 });
MovieSchema.index({ createdAt: -1 });
