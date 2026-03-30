import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { MovieDocument } from '../../schemas/movie.schema';
export declare class TranscodeService {
    private movieModel;
    private configService;
    private readonly logger;
    private readonly transcoderClient;
    private readonly storage;
    private readonly projectId;
    private readonly location;
    private readonly sourceBucket;
    private readonly outputBucket;
    constructor(movieModel: Model<MovieDocument>, configService: ConfigService);
    startTranscode(movieId: string): Promise<{
        status: string;
        message: string;
    }>;
    getStatus(movieId: string): Promise<{
        status: string;
        hlsUrl?: string;
    }>;
    private processTranscode;
    private pollJobCompletion;
    private uploadUrlToGcs;
    private downloadStream;
    private getFilenameFromUrl;
}
