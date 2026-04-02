import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PhoneOtpDocument = PhoneOtp & Document;

@Schema()
export class PhoneOtp {
  @Prop({ required: true, index: true })
  phone: string;

  @Prop({ required: true })
  otpHash: string;

  /** Documents are automatically deleted by MongoDB when this date is reached */
  @Prop({ required: true })
  expiresAt: Date;
}

export const PhoneOtpSchema = SchemaFactory.createForClass(PhoneOtp);

// TTL index: MongoDB removes the document at expiresAt (0 seconds after the field value)
PhoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
