"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const cookieParser = require("cookie-parser");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
const path_1 = require("path");
const fs = require("fs");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.use((0, helmet_1.default)());
    app.use(cookieParser());
    const hlsDir = (0, path_1.join)(process.cwd(), 'public', 'hls');
    if (!fs.existsSync(hlsDir))
        fs.mkdirSync(hlsDir, { recursive: true });
    app.useStaticAssets(hlsDir, {
        prefix: '/hls/',
        setHeaders: (res) => {
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Cache-Control', 'no-cache');
        },
    });
    app.enableCors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-profile-id'],
    });
    const apiPrefix = configService.get('API_PREFIX', 'api/v1');
    app.setGlobalPrefix(apiPrefix);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('VELORA API')
        .setDescription('VELORA Premium Streaming Platform API')
        .setVersion('1.0')
        .addBearerAuth()
        .addCookieAuth('refreshToken')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('docs', app, document);
    const port = configService.get('PORT', 3000);
    await app.listen(port);
    console.log(`VELORA API running on port ${port}`);
    console.log(`Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map