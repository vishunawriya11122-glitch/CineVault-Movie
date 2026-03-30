import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument, AuthProvider } from '../../schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const existingUser = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      authProvider: AuthProvider.LOCAL,
    });

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() }).select('+password');
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    if (!user.password) {
      throw new UnauthorizedException('Please sign in with Google or your phone number');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    user.lastActiveAt = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async googleLogin(profile: any): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    let user = await this.userModel.findOne({ googleId: profile.id });

    if (!user) {
      user = await this.userModel.findOne({ email: profile.emails[0].value });
      if (user) {
        user.googleId = profile.id;
        user.authProvider = AuthProvider.GOOGLE;
        if (!user.avatarUrl && profile.photos?.[0]?.value) {
          user.avatarUrl = profile.photos[0].value;
        }
        await user.save();
      } else {
        user = await this.userModel.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          authProvider: AuthProvider.GOOGLE,
          avatarUrl: profile.photos?.[0]?.value,
          isEmailVerified: true,
        });
      }
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    user.lastActiveAt = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userModel.findById(payload.sub);
      if (!user || user.isSuspended) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { message: 'If an account exists with that email, an OTP has been sent' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetOtp = await bcrypt.hash(otp, 10);
    user.passwordResetOtpExpires = new Date(Date.now() + 600000); // 10 minutes
    await user.save();

    // Send OTP via email using nodemailer
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.configService.get<string>('SMTP_EMAIL', 'cinevaultapp@gmail.com'),
          pass: this.configService.get<string>('SMTP_PASSWORD', ''),
        },
      });

      await transporter.sendMail({
        from: `"CineVault" <${this.configService.get<string>('SMTP_EMAIL', 'cinevaultapp@gmail.com')}>`,
        to: user.email,
        subject: 'CineVault - Password Reset OTP',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#1a1a2e;color:#fff;border-radius:12px;">
            <h2 style="color:#d4af37;text-align:center;">CineVault</h2>
            <p>Hi ${user.name},</p>
            <p>Your password reset OTP is:</p>
            <div style="text-align:center;margin:20px 0;">
              <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#d4af37;background:#2a2a4e;padding:12px 24px;border-radius:8px;">${otp}</span>
            </div>
            <p style="color:#aaa;font-size:13px;">This OTP expires in 10 minutes. If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch (e) {
      // Log but don't fail — OTP is saved in DB regardless
      console.error('Failed to send OTP email:', e.message);
    }

    return { message: 'If an account exists with that email, an OTP has been sent' };
  }

  async verifyOtp(email: string, otp: string): Promise<{ message: string; resetToken: string }> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase(), passwordResetOtpExpires: { $gt: new Date() } })
      .select('+passwordResetOtp');

    if (!user || !user.passwordResetOtp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const isValid = await bcrypt.compare(otp, user.passwordResetOtp);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // OTP verified — generate a reset token for the password change step
    const resetToken = uuidv4();
    user.passwordResetToken = await bcrypt.hash(resetToken, 10);
    user.passwordResetExpires = new Date(Date.now() + 600000); // 10 min
    user.passwordResetOtp = null as any;
    user.passwordResetOtpExpires = null as any;
    await user.save();

    return { message: 'OTP verified successfully', resetToken };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (!user.password) {
      throw new BadRequestException('Cannot change password for social login accounts');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return { message: 'Password changed successfully' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const users = await this.userModel
      .find({ passwordResetExpires: { $gt: new Date() } })
      .select('+passwordResetToken');

    let matchedUser: UserDocument | null = null;
    for (const user of users) {
      if (user.passwordResetToken && await bcrypt.compare(token, user.passwordResetToken)) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    matchedUser.password = await bcrypt.hash(newPassword, 12);
    matchedUser.passwordResetToken = null as any;
    matchedUser.passwordResetExpires = null as any;
    await matchedUser.save();

    return { message: 'Password has been reset successfully' };
  }

  async validateUser(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId);
  }

  private async generateTokens(user: UserDocument): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY', '30d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: UserDocument) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };
  }
}
