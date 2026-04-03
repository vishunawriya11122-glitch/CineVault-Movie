import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AppSettingsDocument = AppSettings & Document;

@Schema({ timestamps: true })
export class AppSettings {
  @Prop({ default: '' })
  tmdbAccessToken: string;
}

export const AppSettingsSchema = SchemaFactory.createForClass(AppSettings);
