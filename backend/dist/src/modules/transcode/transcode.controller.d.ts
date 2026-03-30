import { TranscodeService } from './transcode.service';
export declare class TranscodeController {
    private readonly transcodeService;
    constructor(transcodeService: TranscodeService);
    startTranscode(movieId: string): Promise<{
        status: string;
        message: string;
    }>;
    getStatus(movieId: string): Promise<{
        status: string;
        hlsUrl?: string;
    }>;
}
