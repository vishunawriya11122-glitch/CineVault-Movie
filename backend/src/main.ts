import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // Serve HLS files statically (before global prefix)
  const hlsDir = join(process.cwd(), 'public', 'hls');
  if (!fs.existsSync(hlsDir)) fs.mkdirSync(hlsDir, { recursive: true });
  app.useStaticAssets(hlsDir, {
    prefix: '/hls/',
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'no-cache');
    },
  });

  // CORS
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-profile-id'],
  });

  // Global prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('VELORA API')
    .setDescription('VELORA Premium Streaming Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refreshToken')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`VELORA API running on port ${port}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
