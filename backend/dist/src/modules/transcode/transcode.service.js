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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TranscodeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscodeService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const mongoose_2 = require("mongoose");
const movie_schema_1 = require("../../schemas/movie.schema");
const video_transcoder_1 = require("@google-cloud/video-transcoder");
const storage_1 = require("@google-cloud/storage");
const http = require("http");
const https = require("https");
const path = require("path");
let TranscodeService = TranscodeService_1 = class TranscodeService {
    constructor(movieModel, configService) {
        this.movieModel = movieModel;
        this.configService = configService;
        this.logger = new common_1.Logger(TranscodeService_1.name);
        const keyFilePath = path.join(process.cwd(), 'gcp-service-account.json');
        this.projectId = this.configService.get('GCP_PROJECT_ID', 'cinevault-streaming');
        this.location = this.configService.get('GCP_LOCATION', 'asia-south1');
        this.sourceBucket = this.configService.get('GCP_SOURCE_BUCKET', 'cinevault-source');
        this.outputBucket = this.configService.get('GCP_OUTPUT_BUCKET', 'cinevault-hls-output');
        this.transcoderClient = new video_transcoder_1.TranscoderServiceClient({ keyFilename: keyFilePath });
        this.storage = new storage_1.Storage({ keyFilename: keyFilePath });
    }
    async startTranscode(movieId) {
        const movie = await this.movieModel.findById(movieId);
        if (!movie)
            throw new common_1.NotFoundException('Movie not found');
        const sourceUrl = movie.streamingSources?.[0]?.url;
        if (!sourceUrl)
            throw new common_1.NotFoundException('No streaming source URL found');
        if (movie.hlsStatus === 'processing') {
            return { status: 'processing', message: 'Transcoding already in progress' };
        }
        await this.movieModel.findByIdAndUpdate(movieId, { hlsStatus: 'processing' }, { runValidators: false });
        this.processTranscode(movieId, sourceUrl).catch((error) => {
            this.logger.error(`Transcoding failed for ${movieId}: ${error.message}`);
            this.movieModel.findByIdAndUpdate(movieId, { hlsStatus: 'failed' }, { runValidators: false }).exec();
        });
        return { status: 'processing', message: 'Transcoding started on Google Cloud. This is much faster than local encoding.' };
    }
    async getStatus(movieId) {
        const movie = await this.movieModel.findById(movieId);
        if (!movie)
            throw new common_1.NotFoundException('Movie not found');
        return {
            status: movie.hlsStatus || 'none',
            hlsUrl: movie.hlsUrl || undefined,
        };
    }
    async processTranscode(movieId, sourceUrl) {
        const gcsSourcePath = `sources/${movieId}/${this.getFilenameFromUrl(sourceUrl)}`;
        this.logger.log(`[${movieId}] Uploading source to GCS: gs://${this.sourceBucket}/${gcsSourcePath}`);
        await this.uploadUrlToGcs(sourceUrl, this.sourceBucket, gcsSourcePath);
        this.logger.log(`[${movieId}] Upload to GCS complete`);
        const outputPrefix = `hls/${movieId}/`;
        const inputUri = `gs://${this.sourceBucket}/${gcsSourcePath}`;
        const outputUri = `gs://${this.outputBucket}/${outputPrefix}`;
        this.logger.log(`[${movieId}] Creating Google Cloud Transcoder job...`);
        const [job] = await this.transcoderClient.createJob({
            parent: this.transcoderClient.locationPath(this.projectId, this.location),
            job: {
                inputUri,
                outputUri,
                config: {
                    elementaryStreams: [
                        {
                            key: 'video-1080p',
                            videoStream: {
                                h264: {
                                    heightPixels: 1080,
                                    widthPixels: 1920,
                                    bitrateBps: 5000000,
                                    frameRate: 24,
                                    gopDuration: { seconds: 2 },
                                    profile: 'high',
                                    preset: 'veryfast',
                                },
                            },
                        },
                        {
                            key: 'video-720p',
                            videoStream: {
                                h264: {
                                    heightPixels: 720,
                                    widthPixels: 1280,
                                    bitrateBps: 3000000,
                                    frameRate: 24,
                                    gopDuration: { seconds: 2 },
                                    profile: 'high',
                                    preset: 'veryfast',
                                },
                            },
                        },
                        {
                            key: 'video-480p',
                            videoStream: {
                                h264: {
                                    heightPixels: 480,
                                    widthPixels: 854,
                                    bitrateBps: 1500000,
                                    frameRate: 24,
                                    gopDuration: { seconds: 2 },
                                    profile: 'main',
                                    preset: 'veryfast',
                                },
                            },
                        },
                        {
                            key: 'video-360p',
                            videoStream: {
                                h264: {
                                    heightPixels: 360,
                                    widthPixels: 640,
                                    bitrateBps: 800000,
                                    frameRate: 24,
                                    gopDuration: { seconds: 2 },
                                    profile: 'main',
                                    preset: 'veryfast',
                                },
                            },
                        },
                        {
                            key: 'audio-aac',
                            audioStream: {
                                codec: 'aac',
                                bitrateBps: 128000,
                                sampleRateHertz: 48000,
                                channelCount: 2,
                            },
                        },
                    ],
                    muxStreams: [
                        { key: 'video-1080p-hls', container: 'ts', elementaryStreams: ['video-1080p', 'audio-aac'], segmentSettings: { segmentDuration: { seconds: 6 } } },
                        { key: 'video-720p-hls', container: 'ts', elementaryStreams: ['video-720p', 'audio-aac'], segmentSettings: { segmentDuration: { seconds: 6 } } },
                        { key: 'video-480p-hls', container: 'ts', elementaryStreams: ['video-480p', 'audio-aac'], segmentSettings: { segmentDuration: { seconds: 6 } } },
                        { key: 'video-360p-hls', container: 'ts', elementaryStreams: ['video-360p', 'audio-aac'], segmentSettings: { segmentDuration: { seconds: 6 } } },
                    ],
                    manifests: [
                        {
                            fileName: 'master.m3u8',
                            type: 'HLS',
                            muxStreams: ['video-1080p-hls', 'video-720p-hls', 'video-480p-hls', 'video-360p-hls'],
                        },
                    ],
                },
            },
        });
        const jobName = job.name;
        this.logger.log(`[${movieId}] Transcoder job created: ${jobName}`);
        await this.pollJobCompletion(movieId, jobName);
        const hlsUrl = `https://storage.googleapis.com/${this.outputBucket}/${outputPrefix}master.m3u8`;
        await this.movieModel.findByIdAndUpdate(movieId, {
            hlsUrl,
            hlsStatus: 'completed',
        }, { runValidators: false });
        await this.storage.bucket(this.sourceBucket).file(gcsSourcePath).delete().catch(() => { });
        this.logger.log(`[${movieId}] Transcoding completed: ${hlsUrl}`);
    }
    async pollJobCompletion(movieId, jobName) {
        const maxWaitMs = 60 * 60 * 1000;
        const pollIntervalMs = 15000;
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            const [job] = await this.transcoderClient.getJob({ name: jobName });
            const state = job.state;
            this.logger.log(`[${movieId}] Job state: ${state}`);
            if (state === 'SUCCEEDED')
                return;
            if (state === 'FAILED') {
                const errorMsg = job.error?.message || 'Unknown transcoding error';
                throw new Error(`Transcoder job failed: ${errorMsg}`);
            }
            await new Promise((r) => setTimeout(r, pollIntervalMs));
        }
        throw new Error('Transcoder job timed out after 1 hour');
    }
    uploadUrlToGcs(sourceUrl, bucket, destPath) {
        return new Promise((resolve, reject) => {
            const file = this.storage.bucket(bucket).file(destPath);
            const writeStream = file.createWriteStream({
                resumable: true,
                contentType: 'video/mp4',
                metadata: { cacheControl: 'no-cache' },
            });
            writeStream.on('finish', () => resolve());
            writeStream.on('error', (err) => reject(err));
            this.downloadStream(sourceUrl, writeStream).catch(reject);
        });
    }
    downloadStream(url, dest, maxRedirects = 10) {
        return new Promise((resolve, reject) => {
            if (maxRedirects <= 0)
                return reject(new Error('Too many redirects'));
            const client = url.startsWith('https') ? https : http;
            client.get(url, (response) => {
                const statusCode = response.statusCode ?? 0;
                if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
                    let redirectUrl = response.headers.location;
                    if (redirectUrl.startsWith('/')) {
                        const parsed = new URL(url);
                        redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
                    }
                    response.resume();
                    return this.downloadStream(redirectUrl, dest, maxRedirects - 1).then(resolve).catch(reject);
                }
                if (statusCode !== 200) {
                    response.resume();
                    return reject(new Error(`Download failed: HTTP ${statusCode}`));
                }
                let downloaded = 0;
                response.on('data', (chunk) => {
                    downloaded += chunk.length;
                    if (downloaded % (100 * 1024 * 1024) < chunk.length) {
                        this.logger.log(`  Uploaded ${Math.round(downloaded / 1024 / 1024)} MB to GCS...`);
                    }
                });
                response.pipe(dest);
                response.on('end', () => resolve());
                response.on('error', reject);
            }).on('error', reject);
        });
    }
    getFilenameFromUrl(url) {
        try {
            const pathname = new URL(url).pathname;
            const filename = pathname.split('/').pop() || 'source.mp4';
            return decodeURIComponent(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
        }
        catch {
            return 'source.mp4';
        }
    }
};
exports.TranscodeService = TranscodeService;
exports.TranscodeService = TranscodeService = TranscodeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(movie_schema_1.Movie.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        config_1.ConfigService])
], TranscodeService);
//# sourceMappingURL=transcode.service.js.map