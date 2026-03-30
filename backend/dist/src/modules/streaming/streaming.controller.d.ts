import { StreamingService } from './streaming.service';
export declare class StreamingController {
    private readonly streamingService;
    constructor(streamingService: StreamingService);
    getStreamUrl(path: string): Promise<{
        url: string;
    }>;
}
