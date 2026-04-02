"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const mongoose_2 = require("mongoose");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const uuid_1 = require("uuid");
const user_schema_1 = require("../../schemas/user.schema");
const phone_otp_schema_1 = require("../../schemas/phone-otp.schema");
let AuthService = class AuthService {
    constructor(userModel, phoneOtpModel, jwtService, configService) {
        this.userModel = userModel;
        this.phoneOtpModel = phoneOtpModel;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async register(dto) {
        const existingUser = await this.userModel.findOne({ email: dto.email.toLowerCase() });
        if (existingUser) {
            throw new common_1.ConflictException('An account with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const user = await this.userModel.create({
            name: dto.name,
            email: dto.email.toLowerCase(),
            password: hashedPassword,
            authProvider: user_schema_1.AuthProvider.LOCAL,
        });
        const tokens = await this.generateTokens(user);
        return {
            ...tokens,
            user: this.sanitizeUser(user),
        };
    }
    async login(dto) {
        const user = await this.userModel.findOne({ email: dto.email.toLowerCase() }).select('+password');
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (user.isSuspended) {
            throw new common_1.UnauthorizedException('Your account has been suspended');
        }
        if (!user.password) {
            throw new common_1.UnauthorizedException('Please sign in with Google or your phone number');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        user.lastActiveAt = new Date();
        await user.save();
        const tokens = await this.generateTokens(user);
        return {
            ...tokens,
            user: this.sanitizeUser(user),
        };
    }
    async googleLogin(profile) {
        let user = await this.userModel.findOne({ googleId: profile.id });
        if (!user) {
            user = await this.userModel.findOne({ email: profile.emails[0].value });
            if (user) {
                user.googleId = profile.id;
                user.authProvider = user_schema_1.AuthProvider.GOOGLE;
                if (!user.avatarUrl && profile.photos?.[0]?.value) {
                    user.avatarUrl = profile.photos[0].value;
                }
                await user.save();
            }
            else {
                user = await this.userModel.create({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    googleId: profile.id,
                    authProvider: user_schema_1.AuthProvider.GOOGLE,
                    avatarUrl: profile.photos?.[0]?.value,
                    isEmailVerified: true,
                });
            }
        }
        if (user.isSuspended) {
            throw new common_1.UnauthorizedException('Your account has been suspended');
        }
        user.lastActiveAt = new Date();
        await user.save();
        const tokens = await this.generateTokens(user);
        return { ...tokens, user: this.sanitizeUser(user) };
    }
    async refreshToken(refreshToken) {
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('Refresh token required');
        }
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            const user = await this.userModel.findById(payload.sub);
            if (!user || user.isSuspended) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            return this.generateTokens(user);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async forgotPassword(email) {
        const user = await this.userModel.findOne({ email: email.toLowerCase() });
        if (!user) {
            return { message: 'If an account exists with that email, an OTP has been sent' };
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.passwordResetOtp = await bcrypt.hash(otp, 10);
        user.passwordResetOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();
        const smtpEmail = this.configService.get('SMTP_EMAIL', '');
        const smtpPass = this.configService.get('SMTP_PASSWORD', '');
        if (!smtpEmail || !smtpPass) {
            console.error('[AuthService] SMTP_EMAIL or SMTP_PASSWORD env var is not set — OTP email will not be sent. OTP for debugging:', otp);
        }
        else {
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
            }
            catch (e) {
                console.error('[AuthService] Failed to send OTP email:', e.message, e.stack);
            }
        }
        return { message: 'If an account exists with that email, an OTP has been sent' };
    }
    async verifyOtp(email, otp) {
        const user = await this.userModel
            .findOne({ email: email.toLowerCase(), passwordResetOtpExpires: { $gt: new Date() } })
            .select('+passwordResetOtp');
        if (!user || !user.passwordResetOtp) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        const isValid = await bcrypt.compare(otp, user.passwordResetOtp);
        if (!isValid) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        const resetToken = (0, uuid_1.v4)();
        user.passwordResetToken = await bcrypt.hash(resetToken, 10);
        user.passwordResetExpires = new Date(Date.now() + 600000);
        user.passwordResetOtp = null;
        user.passwordResetOtpExpires = null;
        await user.save();
        return { message: 'OTP verified successfully', resetToken };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.userModel.findById(userId).select('+password');
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        if (!user.password) {
            throw new common_1.BadRequestException('Cannot change password for social login accounts');
        }
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();
        return { message: 'Password changed successfully' };
    }
    async resetPassword(token, newPassword) {
        const users = await this.userModel
            .find({ passwordResetExpires: { $gt: new Date() } })
            .select('+passwordResetToken');
        let matchedUser = null;
        for (const user of users) {
            if (user.passwordResetToken && await bcrypt.compare(token, user.passwordResetToken)) {
                matchedUser = user;
                break;
            }
        }
        if (!matchedUser) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        matchedUser.password = await bcrypt.hash(newPassword, 12);
        matchedUser.passwordResetToken = null;
        matchedUser.passwordResetExpires = null;
        await matchedUser.save();
        return { message: 'Password has been reset successfully' };
    }
    async googleVerifyIdToken(idToken) {
        const { uid, email, name, picture } = await this.verifyGoogleToken(idToken);
        if (!email)
            throw new common_1.BadRequestException('Google account has no email');
        let user = await this.userModel.findOne({ googleId: uid });
        if (!user) {
            user = await this.userModel.findOne({ email: email.toLowerCase() });
            if (!user) {
                throw new common_1.UnauthorizedException('This account is not registered with us. Please sign up with Google first.');
            }
            user.googleId = uid;
            user.authProvider = user_schema_1.AuthProvider.GOOGLE;
            if (!user.avatarUrl && picture)
                user.avatarUrl = picture;
            await user.save();
        }
        if (user.isSuspended)
            throw new common_1.UnauthorizedException('Your account has been suspended');
        user.lastActiveAt = new Date();
        await user.save();
        const tokens = await this.generateTokens(user);
        return { ...tokens, user: this.sanitizeUser(user) };
    }
    async googleSignup(idToken) {
        const { uid, email, name, picture } = await this.verifyGoogleToken(idToken);
        if (!email)
            throw new common_1.BadRequestException('Google account has no email');
        const existing = await this.userModel.findOne({
            $or: [{ googleId: uid }, { email: email.toLowerCase() }],
        });
        if (existing) {
            throw new common_1.ConflictException('This account is already registered. Please use Login with Google.');
        }
        const user = await this.userModel.create({
            name: name ?? email.split('@')[0],
            email: email.toLowerCase(),
            googleId: uid,
            authProvider: user_schema_1.AuthProvider.GOOGLE,
            avatarUrl: picture,
            isEmailVerified: true,
        });
        const tokens = await this.generateTokens(user);
        return { ...tokens, user: this.sanitizeUser(user) };
    }
    async verifyGoogleToken(idToken) {
        let data;
        try {
            const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
            data = await response.json();
        }
        catch {
            throw new common_1.UnauthorizedException('Failed to verify Google token');
        }
        if (data.error || !data.sub) {
            throw new common_1.UnauthorizedException('Invalid Google ID token');
        }
        return {
            uid: data.sub,
            email: data.email ?? '',
            name: data.name ?? '',
            picture: data.picture ?? '',
        };
    }
    async verifyFirebasePhoneToken(idToken) {
        const firebaseApiKey = this.configService.get('FIREBASE_WEB_API_KEY') ?? 'AIzaSyCYm3w06LQbfFGqCiGYSBYfbExNokEIJaw';
        let phoneNumber;
        try {
            const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
            const data = await res.json();
            if (!res.ok || !data.users?.length) {
                throw new Error('Invalid token');
            }
            phoneNumber = data.users[0].phoneNumber;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired Firebase token');
        }
        const phone = phoneNumber;
        if (!phone) {
            throw new common_1.BadRequestException('Firebase token does not contain a phone number');
        }
        let user = await this.userModel.findOne({ phone });
        if (!user) {
            const lastFour = phone.slice(-4);
            const numericPhone = phone.replace('+', '');
            const generatedEmail = `ph${numericPhone}@cinevault.app`;
            user = await this.userModel.create({
                name: `User ${lastFour}`,
                email: generatedEmail,
                phone,
                authProvider: user_schema_1.AuthProvider.PHONE,
                isEmailVerified: false,
            });
        }
        if (user.isSuspended) {
            throw new common_1.UnauthorizedException('Your account has been suspended');
        }
        user.lastActiveAt = new Date();
        await user.save();
        const tokens = await this.generateTokens(user);
        return { ...tokens, user: this.sanitizeUser(user) };
    }
    async sendPhoneOtp(phone) {
        const cleaned = phone.replace(/\s/g, '');
        if (!/^\+91[6-9]\d{9}$/.test(cleaned)) {
            throw new common_1.BadRequestException('Please enter a valid Indian mobile number (+91 followed by 10 digits starting with 6-9)');
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const otpHash = await bcrypt.hash(otp, 10);
        await this.phoneOtpModel.deleteMany({ phone: cleaned });
        await this.phoneOtpModel.create({
            phone: cleaned,
            otpHash,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });
        const smsSent = await this.sendSmsOtp(cleaned, otp);
        if (!smsSent) {
            return { message: 'OTP generated (SMS not configured — use devOtp to verify)', devOtp: otp };
        }
        return { message: 'OTP sent successfully to your mobile number' };
    }
    async verifyPhoneOtp(phone, otp) {
        const cleaned = phone.replace(/\s/g, '');
        if (!/^\+91[6-9]\d{9}$/.test(cleaned)) {
            throw new common_1.BadRequestException('Invalid phone number format');
        }
        const otpRecord = await this.phoneOtpModel.findOne({
            phone: cleaned,
            expiresAt: { $gt: new Date() },
        });
        if (!otpRecord) {
            throw new common_1.BadRequestException('OTP has expired or was never sent. Please request a new OTP');
        }
        const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
        if (!isValid) {
            throw new common_1.BadRequestException('Invalid OTP. Please check and try again');
        }
        await this.phoneOtpModel.deleteOne({ _id: otpRecord._id });
        let user = await this.userModel.findOne({ phone: cleaned });
        if (!user) {
            const lastFour = cleaned.slice(-4);
            const numericPhone = cleaned.replace('+', '');
            const generatedEmail = `ph${numericPhone}@cinevault.app`;
            user = await this.userModel.create({
                name: `User ${lastFour}`,
                email: generatedEmail,
                phone: cleaned,
                authProvider: user_schema_1.AuthProvider.PHONE,
                isEmailVerified: false,
            });
        }
        if (user.isSuspended) {
            throw new common_1.UnauthorizedException('Your account has been suspended');
        }
        user.lastActiveAt = new Date();
        await user.save();
        const tokens = await this.generateTokens(user);
        return { ...tokens, user: this.sanitizeUser(user) };
    }
    async sendSmsOtp(phone, otp) {
        const apiKey = this.configService.get('FAST2SMS_API_KEY', '');
        const phoneNumber = phone.replace('+91', '');
        if (!apiKey) {
            console.warn(`[AuthService] FAST2SMS_API_KEY not set. OTP for ${phone}: ${otp}`);
            return false;
        }
        try {
            const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=otp&variables_values=${otp}&numbers=${phoneNumber}&flash=0`;
            const response = await fetch(url);
            const data = await response.json();
            if (!data.return) {
                console.error('[AuthService] Fast2SMS error:', JSON.stringify(data));
                return false;
            }
            return true;
        }
        catch (err) {
            console.error('[AuthService] Failed to send SMS OTP:', err);
            return false;
        }
    }
    async validateUser(userId) {
        return this.userModel.findById(userId);
    }
    async generateTokens(user) {
        const payload = { sub: user._id.toString(), email: user.email, role: user.role };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '30d'),
            }),
        ]);
        return { accessToken, refreshToken };
    }
    sanitizeUser(user) {
        return {
            id: user._id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(phone_otp_schema_1.PhoneOtp.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map