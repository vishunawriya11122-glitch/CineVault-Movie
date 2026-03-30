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
const uuid_1 = require("uuid");
const user_schema_1 = require("../../schemas/user.schema");
let AuthService = class AuthService {
    constructor(userModel, jwtService, configService) {
        this.userModel = userModel;
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
            return { message: 'If an account exists with that email, a reset link has been sent' };
        }
        const resetToken = (0, uuid_1.v4)();
        user.passwordResetToken = await bcrypt.hash(resetToken, 10);
        user.passwordResetExpires = new Date(Date.now() + 3600000);
        await user.save();
        return { message: 'If an account exists with that email, a reset link has been sent' };
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
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map