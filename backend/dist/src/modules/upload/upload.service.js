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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
const crypto = require("crypto");
const fs_1 = require("fs");
let UploadService = class UploadService {
    constructor(configService) {
        this.configService = configService;
        this.s3Client = new client_s3_1.S3Client({
            region: configService.get('S3_REGION', 'us-east-1'),
            endpoint: configService.get('S3_ENDPOINT'),
            credentials: {
                accessKeyId: configService.get('S3_ACCESS_KEY', ''),
                secretAccessKey: configService.get('S3_SECRET_KEY', ''),
            },
        });
        this.bucket = configService.get('S3_BUCKET', 'cinevault-media');
        this.cdnBaseUrl = configService.get('CDN_BASE_URL', '');
    }
    async getPresignedUploadUrl(folder, filename, contentType) {
        const ext = filename.split('.').pop();
        const key = `${folder}/${(0, uuid_1.v4)()}.${ext}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: 3600 });
        const publicUrl = this.cdnBaseUrl ? `${this.cdnBaseUrl}/${key}` : `https://${this.bucket}.s3.amazonaws.com/${key}`;
        return { uploadUrl, key, publicUrl };
    }
    async uploadFileFromDisk(key, filePath, contentType) {
        const fileStream = (0, fs_1.createReadStream)(filePath);
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: fileStream,
            ContentType: contentType,
        });
        await this.s3Client.send(command);
        return this.cdnBaseUrl ? `${this.cdnBaseUrl}/${key}` : `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }
    generateSignedVideoUrl(videoPath) {
        const secret = this.configService.get('VIDEO_SIGN_SECRET', 'default-secret');
        const expiry = Math.floor(Date.now() / 1000) + this.configService.get('VIDEO_URL_EXPIRY', 3600);
        const dataToSign = `${videoPath}:${expiry}`;
        const signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
        const baseUrl = this.cdnBaseUrl || `https://${this.bucket}.s3.amazonaws.com`;
        return `${baseUrl}/${videoPath}?expires=${expiry}&signature=${signature}`;
    }
    verifySignedUrl(videoPath, expires, signature) {
        if (expires < Math.floor(Date.now() / 1000))
            return false;
        const secret = this.configService.get('VIDEO_SIGN_SECRET', 'default-secret');
        const dataToSign = `${videoPath}:${expires}`;
        const expectedSignature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadService);
//# sourceMappingURL=upload.service.js.map