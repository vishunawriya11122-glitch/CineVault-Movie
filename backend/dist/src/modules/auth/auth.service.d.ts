import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { UserDocument } from '../../schemas/user.schema';
import { PhoneOtpDocument } from '../../schemas/phone-otp.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private userModel;
    private phoneOtpModel;
    private jwtService;
    private configService;
    constructor(userModel: Model<UserDocument>, phoneOtpModel: Model<PhoneOtpDocument>, jwtService: JwtService, configService: ConfigService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    googleLogin(profile: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    verifyOtp(email: string, otp: string): Promise<{
        message: string;
        resetToken: string;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    googleVerifyIdToken(idToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    googleSignup(idToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    private verifyGoogleToken;
    verifyFirebasePhoneToken(idToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    sendPhoneOtp(phone: string): Promise<{
        message: string;
        devOtp?: string;
    }>;
    verifyPhoneOtp(phone: string, otp: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    private sendSmsOtp;
    validateUser(userId: string): Promise<UserDocument | null>;
    private generateTokens;
    private sanitizeUser;
}
