import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContentViewDocument = ContentView & Document;

@Schema({ timestamps: true })
export class ContentView {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  contentId: string; // movieId or episodeId

  @Prop({ required: true, enum: ['movie', 'episode'] })
  contentType: string;

  @Prop()
  seriesId: string; // parent series id (for episodes)

  @Prop()
  seasonId: string; // parent season id (for episodes)

  @Prop()
  deviceId: string; // optional device identifier

  @Prop()
  userEmail: string; // denormalized for quick lookups
}

export const ContentViewSchema = SchemaFactory.createForClass(ContentView);

// Unique constraint: one view per user per content
ContentViewSchema.index({ userId: 1, contentId: 1 }, { unique: true });
ContentViewSchema.index({ contentId: 1 });
ContentViewSchema.index({ seriesId: 1 });
ContentViewSchema.index({ seasonId: 1 });
ContentViewSchema.index({ createdAt: -1 });
