import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  CONTENT_MANAGER = 'content_manager',
  MODERATOR = 'moderator',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  PHONE = 'phone',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ select: false })
  password: string;

  @Prop()
  phone: string;

  @Prop()
  avatarUrl: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ type: String, enum: AuthProvider, default: AuthProvider.LOCAL })
  authProvider: AuthProvider;

  @Prop()
  googleId: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: false })
  isSuspended: boolean;

  @Prop()
  suspendReason: string;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  twoFactorSecret: string;

  @Prop([String])
  fcmTokens: string[];

  @Prop({ type: [Types.ObjectId], ref: 'Profile' })
  profiles: Types.ObjectId[];

  @Prop()
  lastActiveAt: Date;

  @Prop()
  deviceInfo: string;

  @Prop()
  passwordResetToken: string;

  @Prop()
  passwordResetExpires: Date;

  @Prop()
  passwordResetOtp: string;

  @Prop()
  passwordResetOtpExpires: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1, authProvider: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { sparse: true });
UserSchema.index({ role: 1 });
