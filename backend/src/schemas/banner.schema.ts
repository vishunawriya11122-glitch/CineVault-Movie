import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BannerDocument = Banner & Document;

export enum BannerType {
  HERO = 'hero',
  MID = 'mid',
}

export enum BannerSection {
  HOME = 'home',
  MOVIES = 'movies',
  SHOWS = 'shows',
  ANIME = 'anime',
}

@Schema({ timestamps: true })
export class Banner {
  @Prop({ required: true })
  title: string;

  @Prop()
  subtitle: string;

  @Prop({ required: true })
  imageUrl: string; // 16:9 banner

  @Prop({ type: Types.ObjectId, ref: 'Movie' })
  contentId: Types.ObjectId;

  @Prop({ default: 'movie' })
  actionType: string;

  @Prop()
  logoUrl: string;

  @Prop()
  tagline: string;

  @Prop([String])
  genreTags: string[];

  @Prop({ default: 0 })
  displayOrder: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  activeFrom: Date;

  @Prop()
  activeTo: Date;

  @Prop({ enum: BannerSection, default: BannerSection.HOME })
  section: BannerSection;

  @Prop({ enum: BannerType, default: BannerType.HERO })
  type: BannerType;

  @Prop({ default: 2 })
  position: number; // For mid banners: insert after this many sections (e.g. 2 = after 2nd section)
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
BannerSchema.index({ isActive: 1, displayOrder: 1, section: 1 });
