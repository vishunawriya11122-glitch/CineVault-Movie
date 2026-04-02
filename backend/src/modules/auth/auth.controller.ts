import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.googleLogin(req.user);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user };
  }

  @Post('google/mobile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google ID token (Android/iOS) — user must be already registered' })
  async googleMobile(
    @Body() body: { idToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.googleVerifyIdToken(body.idToken);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user };
  }

  @Post('google/mobile/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sign up with Google ID token (Android/iOS) — creates new account' })
  async googleMobileSignup(
    @Body() body: { idToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.googleSignup(body.idToken);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token (cookie or body)' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await this.authService.refreshToken(refreshToken);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, refreshToken: result.refreshToken };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP for password reset' })
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (authenticated user)' })
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear refresh token' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/v1/auth',
    });
    return { message: 'Logged out successfully' };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/api/v1/auth',
    });
  }
}
