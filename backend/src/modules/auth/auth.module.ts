import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { User, UserSchema } from '../../schemas/user.schema';
import { PhoneOtp, PhoneOtpSchema } from '../../schemas/phone-otp.schema';
import { EmailOtp, EmailOtpSchema } from '../../schemas/email-otp.schema';

const optionalProviders = [];
if (process.env.GOOGLE_CLIENT_ID) {
  optionalProviders.push(GoogleStrategy);
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PhoneOtp.name, schema: PhoneOtpSchema },
      { name: EmailOtp.name, schema: EmailOtpSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ...optionalProviders],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
