import { UploadService } from '../upload/upload.service';
export declare class StreamingService {
    private uploadService;
    constructor(uploadService: UploadService);
    getSignedStreamUrl(videoPath: string): {
        url: string;
    };
    verifyStreamAccess(videoPath: string, expires: number, signature: string): boolean;
}
