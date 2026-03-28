import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HomeSectionDocument = HomeSection & Document;

export enum SectionType {
  STANDARD = 'standard', // Normal horizontal scrolling
  LARGE_CARD = 'large_card', // Bigger cards
  MID_BANNER = 'mid_banner', // Square banner between sections
  TRENDING = 'trending', // Top 10 with numbers
}

export enum CardSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export enum TabSection {
  HOME = 'home',
  MOVIES = 'movies',
  SHOWS = 'shows',
  ANIME = 'anime',
}

@Schema({ timestamps: true })
export class HomeSection {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop()
  slug: string;

  @Prop({ required: true, enum: SectionType, default: SectionType.STANDARD })
  type: SectionType;

  @Prop({ type: [Types.ObjectId], ref: 'Movie' })
  contentIds: Types.ObjectId[];

  @Prop({ default: 0 })
  displayOrder: number;

  @Prop({ default: true })
  isVisible: boolean;

  @Prop({ default: false })
  isSystemManaged: boolean;

  @Prop()
  contentType: string;

  @Prop()
  genre: string;

  @Prop()
  sortBy: string;

  @Prop({ default: 20 })
  maxItems: number;

  @Prop({ enum: CardSize, default: CardSize.SMALL })
  cardSize: CardSize;

  @Prop({ default: true })
  showViewMore: boolean;

  @Prop({ default: 'View More' })
  viewMoreText: string;

  @Prop()
  bannerImageUrl: string; // For mid_banner type

  @Prop({ default: false })
  showTrendingNumbers: boolean; // For trending type - shows 1, 2, 3...

  @Prop([String])
  tags: string[]; // For categorizing sections

  @Prop([String])
  contentTypes: string[]; // For system sections with multiple content-type filters (e.g. ['web_series','tv_show'])

  @Prop({ enum: TabSection, default: TabSection.HOME })
  section: TabSection;
}

export const HomeSectionSchema = SchemaFactory.createForClass(HomeSection);
HomeSectionSchema.index({ displayOrder: 1, isVisible: 1, section: 1 });
HomeSectionSchema.index({ type: 1 });
