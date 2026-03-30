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
      // Return success even if user not found to prevent email enumeration
      return { message: 'If an account exists with that email, a reset link has been sent' };
    }

    const resetToken = uuidv4();
    user.passwordResetToken = await bcrypt.hash(resetToken, 10);
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // In production: send email with reset link containing resetToken
    return { message: 'If an account exists with that email, a reset link has been sent' };
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
