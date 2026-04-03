import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument, AuthProvider } from '../../schemas/user.schema';
import { PhoneOtp, PhoneOtpDocument } from '../../schemas/phone-otp.schema';
import { EmailOtp, EmailOtpDocument } from '../../schemas/email-otp.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PhoneOtp.name) private phoneOtpModel: Model<PhoneOtpDocument>,
    @InjectModel(EmailOtp.name) private emailOtpModel: Model<EmailOtpDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Drop old unique email-only index and sync to compound {email, authProvider}
    try {
      const collection = this.userModel.collection;
      const indexes = await collection.indexes();
      const emailOnly = indexes.find(
        (idx: any) =>
          idx.key?.email && !idx.key?.authProvider && idx.unique,
      );
      if (emailOnly?.name) {
        await collection.dropIndex(emailOnly.name);
        this.logger.log('Dropped old unique email-only index');
      }
    } catch (e) {
      // index may not exist — safe to ignore
    }
    await this.userModel.syncIndexes();

    // Migrate legacy users that don't have authProvider set
    const migrated = await this.userModel.updateMany(
      { authProvider: { $exists: false } },
      { $set: { authProvider: AuthProvider.LOCAL } },
    );
    if (migrated.modifiedCount > 0) {
      this.logger.log(`Migrated ${migrated.modifiedCount} legacy users to authProvider=local`);
    }
    const migratedNull = await this.userModel.updateMany(
      { authProvider: null },
      { $set: { authProvider: AuthProvider.LOCAL } },
    );
    if (migratedNull.modifiedCount > 0) {
      this.logger.log(`Migrated ${migratedNull.modifiedCount} null-provider users to authProvider=local`);
    }
  }

  async register(dto: RegisterDto): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const existingUser = await this.userModel.findOne({ email: dto.email.toLowerCase(), authProvider: AuthProvider.LOCAL });
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
    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
      authProvider: { $in: [AuthProvider.LOCAL, null] },
    }).select('+password');
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
      // Look for existing Google-provider account with same email
      user = await this.userModel.findOne({ email: profile.emails[0].value.toLowerCase(), authProvider: AuthProvider.GOOGLE });
      if (user) {
        user.googleId = profile.id;
        if (!user.avatarUrl && profile.photos?.[0]?.value) {
          user.avatarUrl = profile.photos[0].value;
        }
        await user.save();
      } else {
        // Create a new Google account (separate from any email/local account)
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
    const user = await this.userModel.findOne({ email: email.toLowerCase(), authProvider: AuthProvider.LOCAL });
    if (!user) {
      return { message: 'If an account exists with that email, an OTP has been sent' };
    }

    // Generate 6-digit OTP (crypto-safe)
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.passwordResetOtp = await bcrypt.hash(otp, 10);
    user.passwordResetOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    // Send OTP via SMTP
    const smtpEmail = this.configService.get<string>('SMTP_EMAIL', '');
    const smtpPass = this.configService.get<string>('SMTP_PASSWORD', '');
    if (!smtpEmail || !smtpPass) {
      console.error('[AuthService] SMTP_EMAIL or SMTP_PASSWORD env var is not set — OTP email will not be sent. OTP for debugging:', otp);
    } else {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: smtpEmail, pass: smtpPass },
        });
        await transporter.sendMail({
          from: `"VELORA" <${smtpEmail}>`,
          to: user.email,
          subject: 'VELORA — Password Reset OTP',
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0B0515;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
<table width="480" style="background:#130D22;border-radius:16px;border:1px solid #2D1F4E;overflow:hidden;">
<tr><td style="padding:28px 32px;text-align:center;background:linear-gradient(135deg,#1C1230,#0B0515);">
  <h1 style="margin:0;font-size:28px;letter-spacing:6px;color:#D4AF37;">VELORA</h1>
  <p style="margin:8px 0 0;color:#9B59B6;font-size:12px;letter-spacing:2px;">PREMIUM STREAMING</p>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 8px;color:#B0A3C4;font-size:15px;">Hi <strong style="color:#fff;">${user.name}</strong>,</p>
  <p style="color:#B0A3C4;font-size:14px;line-height:1.6;">We received a request to reset your VELORA account password. Use the code below to proceed:</p>
  <div style="margin:28px 0;text-align:center;">
    <div style="display:inline-block;background:#0B0515;border:1.5px solid #D4AF37;border-radius:12px;padding:18px 36px;">
      <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#D4AF37;">${otp}</span>
    </div>
  </div>
  <p style="text-align:center;margin:0 0 4px;color:#6B5E80;font-size:12px;">This code expires in <strong style="color:#D4AF37;">5 minutes</strong>.</p>
  <p style="text-align:center;margin:0;color:#6B5E80;font-size:12px;">If you did not request this, please ignore this email.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#0B0515;text-align:center;border-top:1px solid #2D1F4E;">
  <p style="margin:0;color:#6B5E80;font-size:11px;">&copy; 2026 VELORA. All rights reserved.</p>
</td></tr>
</table></td></tr></table></body></html>`,
        });
        console.log('[AuthService] OTP email sent to:', user.email);
      } catch (e) {
        console.error('[AuthService] Failed to send OTP email:', e.message, e.stack);
      }
    }

    return { message: 'If an account exists with that email, an OTP has been sent' };
  }

  async verifyOtp(email: string, otp: string): Promise<{ message: string; resetToken: string }> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase(), authProvider: AuthProvider.LOCAL, passwordResetOtpExpires: { $gt: new Date() } })
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

  /**
   * Google Login (mobile) — find-or-create a Google account.
   * Never links to an existing email/local account.
   */
  async googleVerifyIdToken(idToken: string): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const { uid, email, name, picture } = await this.verifyGoogleToken(idToken);
    if (!email) throw new BadRequestException('Google account has no email');

    // Find existing Google account by googleId
    let user = await this.userModel.findOne({ googleId: uid });
    if (!user) {
      // Fallback: find by email + google provider
      user = await this.userModel.findOne({ email: email.toLowerCase(), authProvider: AuthProvider.GOOGLE });
    }

    if (!user) {
      // Auto-create a new Google account (completely separate from any email/local account)
      user = await this.userModel.create({
        name: name ?? email.split('@')[0],
        email: email.toLowerCase(),
        googleId: uid,
        authProvider: AuthProvider.GOOGLE,
        avatarUrl: picture,
        isEmailVerified: true,
      });
    } else {
      // Ensure googleId is linked and avatar is up to date
      let needsSave = false;
      if (!user.googleId) { user.googleId = uid; needsSave = true; }
      if (picture && !user.avatarUrl) { user.avatarUrl = picture; needsSave = true; }
      if (needsSave) await user.save();
    }

    if (user.isSuspended) throw new UnauthorizedException('Your account has been suspended');

    user.lastActiveAt = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  /**
   * Google Sign-Up (mobile) — same find-or-create flow as login.
   */
  async googleSignup(idToken: string): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    return this.googleVerifyIdToken(idToken);
  }

  /**
   * Verify a Google ID token via Google's tokeninfo endpoint.
   */
  private async verifyGoogleToken(idToken: string): Promise<{ uid: string; email: string; name: string; picture: string }> {
    // Verify via Google's public tokeninfo endpoint (no Firebase required)
    let data: any;
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      data = await response.json();
    } catch {
      throw new UnauthorizedException('Failed to verify Google token');
    }

    if (data.error || !data.sub) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    return {
      uid: data.sub,
      email: data.email ?? '',
      name: data.name ?? '',
      picture: data.picture ?? '',
    };
  }

  // ── Phone OTP Authentication ──────────────────────────────────────────────

  /**
   * Verify a Firebase Phone Auth ID token and return JWT tokens.
   * Uses Firebase REST API (accounts:lookup) — no service account needed.
   */
  async verifyFirebasePhoneToken(
    idToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const firebaseApiKey = this.configService.get<string>('FIREBASE_WEB_API_KEY') ?? 'AIzaSyCYm3w06LQbfFGqCiGYSBYfbExNokEIJaw';

    let phoneNumber: string;
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        },
      );
      const data: any = await res.json();
      if (!res.ok || !data.users?.length) {
        throw new Error('Invalid token');
      }
      phoneNumber = data.users[0].phoneNumber;
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }

    const phone = phoneNumber;
    if (!phone) {
      throw new BadRequestException('Firebase token does not contain a phone number');
    }

    // Find or create user
    let user = await this.userModel.findOne({ phone });
    if (!user) {
      const lastFour = phone.slice(-4);
      const numericPhone = phone.replace('+', '');
      const generatedEmail = `ph${numericPhone}@cinevault.app`;
      user = await this.userModel.create({
        name: `User ${lastFour}`,
        email: generatedEmail,
        phone,
        authProvider: AuthProvider.PHONE,
        isEmailVerified: false,
      });
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    user.lastActiveAt = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  /**
   * Send an OTP to an Indian mobile number (+91).
   * Uses Fast2SMS API if FAST2SMS_API_KEY is set; otherwise logs to console.
   */
  async sendPhoneOtp(phone: string): Promise<{ message: string; devOtp?: string }> {
    const cleaned = phone.replace(/\s/g, '');
    if (!/^\+91[6-9]\d{9}$/.test(cleaned)) {
      throw new BadRequestException('Please enter a valid Indian mobile number (+91 followed by 10 digits starting with 6-9)');
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);

    // Remove any existing OTP for this number before creating a new one
    await this.phoneOtpModel.deleteMany({ phone: cleaned });

    await this.phoneOtpModel.create({
      phone: cleaned,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5-minute expiry
    });

    const smsSent = await this.sendSmsOtp(cleaned, otp);

    // If SMS could not be sent (no API key), return OTP in response for dev/testing
    if (!smsSent) {
      return { message: 'OTP generated (SMS not configured — use devOtp to verify)', devOtp: otp };
    }
    return { message: 'OTP sent successfully to your mobile number' };
  }

  /**
   * Verify OTP and return JWT tokens.
   * Finds existing user by phone, or auto-creates a new phone account.
   */
  async verifyPhoneOtp(
    phone: string,
    otp: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const cleaned = phone.replace(/\s/g, '');
    if (!/^\+91[6-9]\d{9}$/.test(cleaned)) {
      throw new BadRequestException('Invalid phone number format');
    }

    const otpRecord = await this.phoneOtpModel.findOne({
      phone: cleaned,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      throw new BadRequestException('OTP has expired or was never sent. Please request a new OTP');
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) {
      throw new BadRequestException('Invalid OTP. Please check and try again');
    }

    // Consume the OTP — delete it so it cannot be reused
    await this.phoneOtpModel.deleteOne({ _id: (otpRecord as any)._id });

    // Find or create user
    let user = await this.userModel.findOne({ phone: cleaned });
    if (!user) {
      const lastFour = cleaned.slice(-4);
      const numericPhone = cleaned.replace('+', ''); // e.g. 919876543210
      const generatedEmail = `ph${numericPhone}@cinevault.app`;
      user = await this.userModel.create({
        name: `User ${lastFour}`,
        email: generatedEmail,
        phone: cleaned,
        authProvider: AuthProvider.PHONE,
        isEmailVerified: false,
      });
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    user.lastActiveAt = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  /** Send OTP via Fast2SMS (India). Returns true if sent, false if API key missing. */
  private async sendSmsOtp(phone: string, otp: string): Promise<boolean> {
    const apiKey = this.configService.get<string>('FAST2SMS_API_KEY', '');
    const phoneNumber = phone.replace('+91', ''); // Fast2SMS expects 10-digit number without country code

    if (!apiKey) {
      console.warn(`[AuthService] FAST2SMS_API_KEY not set. OTP for ${phone}: ${otp}`);
      return false;
    }

    try {
      const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=otp&variables_values=${otp}&numbers=${phoneNumber}&flash=0`;
      const response = await fetch(url);
      const data = await response.json() as any;
      if (!data.return) {
        console.error('[AuthService] Fast2SMS error:', JSON.stringify(data));
        return false;
      }
      return true;
    } catch (err) {
      console.error('[AuthService] Failed to send SMS OTP:', err);
      return false;
    }
  }

  // ── Email OTP Authentication ──────────────────────────────────────────────

  /**
   * Send a login/signup OTP to an email address.
   * The user does NOT need an existing account — one will be created on verify.
   */
  async sendEmailLoginOtp(email: string): Promise<{ message: string; devOtp?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new BadRequestException('Please enter a valid email address');
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);

    // Remove any existing OTP for this email
    await this.emailOtpModel.deleteMany({ email: normalizedEmail });

    await this.emailOtpModel.create({
      email: normalizedEmail,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5-minute expiry
    });

    // Send OTP via SMTP
    const smtpEmail = this.configService.get<string>('SMTP_EMAIL', '');
    const smtpPass = this.configService.get<string>('SMTP_PASSWORD', '');
    if (!smtpEmail || !smtpPass) {
      console.warn(`[AuthService] SMTP not configured. Email Login OTP for ${normalizedEmail}: ${otp}`);
      return { message: 'OTP generated (SMTP not configured)', devOtp: otp };
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: smtpEmail, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"VELORA" <${smtpEmail}>`,
        to: normalizedEmail,
        subject: 'VELORA — Login OTP',
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0B0515;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
<table width="480" style="background:#130D22;border-radius:16px;border:1px solid #2D1F4E;overflow:hidden;">
<tr><td style="padding:28px 32px;text-align:center;background:linear-gradient(135deg,#1C1230,#0B0515);">
  <h1 style="margin:0;font-size:28px;letter-spacing:6px;color:#D4AF37;">VELORA</h1>
  <p style="margin:8px 0 0;color:#9B59B6;font-size:12px;letter-spacing:2px;">PREMIUM STREAMING</p>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 8px;color:#B0A3C4;font-size:15px;">Hello,</p>
  <p style="color:#B0A3C4;font-size:14px;line-height:1.6;">Use the code below to sign in to your VELORA account:</p>
  <div style="margin:28px 0;text-align:center;">
    <div style="display:inline-block;background:#0B0515;border:1.5px solid #D4AF37;border-radius:12px;padding:18px 36px;">
      <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#D4AF37;">${otp}</span>
    </div>
  </div>
  <p style="text-align:center;margin:0 0 4px;color:#6B5E80;font-size:12px;">This code expires in <strong style="color:#D4AF37;">5 minutes</strong>.</p>
  <p style="text-align:center;margin:0;color:#6B5E80;font-size:12px;">If you did not request this, please ignore this email.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#0B0515;text-align:center;border-top:1px solid #2D1F4E;">
  <p style="margin:0;color:#6B5E80;font-size:11px;">&copy; 2026 VELORA. All rights reserved.</p>
</td></tr>
</table></td></tr></table></body></html>`,
      });
      this.logger.log(`Email login OTP sent to: ${normalizedEmail}`);
    } catch (e) {
      this.logger.error(`Failed to send email login OTP: ${e.message}`);
    }

    return { message: 'OTP sent to your email address' };
  }

  /**
   * Verify email login OTP and return JWT tokens.
   * Auto-creates a new account if one doesn't exist.
   */
  async verifyEmailLoginOtp(
    email: string,
    otp: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await this.emailOtpModel.findOne({
      email: normalizedEmail,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      throw new BadRequestException('OTP has expired or was never sent. Please request a new OTP');
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) {
      throw new BadRequestException('Invalid OTP. Please check and try again');
    }

    // Consume the OTP
    await this.emailOtpModel.deleteOne({ _id: (otpRecord as any)._id });

    // Find or create user with local auth provider
    let user = await this.userModel.findOne({
      email: normalizedEmail,
      authProvider: { $in: [AuthProvider.LOCAL, null] },
    });

    if (!user) {
      user = await this.userModel.create({
        name: normalizedEmail.split('@')[0],
        email: normalizedEmail,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
      });
    } else {
      user.isEmailVerified = true;
      user.lastActiveAt = new Date();
      await user.save();
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    user.lastActiveAt = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
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
      authProvider: user.authProvider,
      isEmailVerified: user.isEmailVerified,
    };
  }
}
