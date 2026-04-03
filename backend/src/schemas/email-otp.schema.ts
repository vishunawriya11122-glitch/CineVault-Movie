import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmailOtpDocument = EmailOtp & Document;

@Schema()
export class EmailOtp {
  @Prop({ required: true, index: true })
  email: string;

  @Prop({ required: true })
  otpHash: string;

  /** Documents are automatically deleted by MongoDB when this date is reached */
  @Prop({ required: true })
  expiresAt: Date;
}

export const EmailOtpSchema = SchemaFactory.createForClass(EmailOtp);

// TTL index: MongoDB removes the document at expiresAt (0 seconds after the field value)
EmailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
