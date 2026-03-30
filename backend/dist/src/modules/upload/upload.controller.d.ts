import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    getPresignedUrl(body: {
        folder: string;
        filename: string;
        contentType: string;
    }): Promise<{
        uploadUrl: string;
        key: string;
        publicUrl: string;
    }>;
}
