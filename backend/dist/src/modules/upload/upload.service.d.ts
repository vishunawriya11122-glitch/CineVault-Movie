import { ConfigService } from '@nestjs/config';
export declare class UploadService {
    private configService;
    private s3Client;
    private bucket;
    private cdnBaseUrl;
    constructor(configService: ConfigService);
    getPresignedUploadUrl(folder: string, filename: string, contentType: string): Promise<{
        uploadUrl: string;
        key: string;
        publicUrl: string;
    }>;
    uploadFileFromDisk(key: string, filePath: string, contentType: string): Promise<string>;
    generateSignedVideoUrl(videoPath: string): string;
    verifySignedUrl(videoPath: string, expires: number, signature: string): boolean;
}
