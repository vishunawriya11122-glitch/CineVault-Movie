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
exports.SeasonSchema = exports.Season = exports.EpisodeSchema = exports.Episode = exports.AudioTrackSchema = exports.AudioTrack = exports.SubtitleTrackSchema = exports.SubtitleTrack = exports.SkipTimestampSchema = exports.SkipTimestamp = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const movie_schema_1 = require("./movie.schema");
let SkipTimestamp = class SkipTimestamp {
};
exports.SkipTimestamp = SkipTimestamp;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], SkipTimestamp.prototype, "start", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], SkipTimestamp.prototype, "end", void 0);
exports.SkipTimestamp = SkipTimestamp = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], SkipTimestamp);
exports.SkipTimestampSchema = mongoose_1.SchemaFactory.createForClass(SkipTimestamp);
let SubtitleTrack = class SubtitleTrack {
};
exports.SubtitleTrack = SubtitleTrack;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], SubtitleTrack.prototype, "language", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], SubtitleTrack.prototype, "url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], SubtitleTrack.prototype, "isDefault", void 0);
exports.SubtitleTrack = SubtitleTrack = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], SubtitleTrack);
exports.SubtitleTrackSchema = mongoose_1.SchemaFactory.createForClass(SubtitleTrack);
let AudioTrack = class AudioTrack {
};
exports.AudioTrack = AudioTrack;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AudioTrack.prototype, "language", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AudioTrack.prototype, "label", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], AudioTrack.prototype, "isDefault", void 0);
exports.AudioTrack = AudioTrack = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], AudioTrack);
exports.AudioTrackSchema = mongoose_1.SchemaFactory.createForClass(AudioTrack);
let Episode = class Episode {
};
exports.Episode = Episode;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Season', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Episode.prototype, "seasonId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Episode.prototype, "episodeNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Episode.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Episode.prototype, "synopsis", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Episode.prototype, "duration", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Episode.prototype, "airDate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Episode.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [movie_schema_1.StreamingSourceSchema] }),
    __metadata("design:type", Array)
], Episode.prototype, "streamingSources", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.SkipTimestampSchema }),
    __metadata("design:type", SkipTimestamp)
], Episode.prototype, "skipIntro", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.SkipTimestampSchema }),
    __metadata("design:type", SkipTimestamp)
], Episode.prototype, "skipRecap", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.SubtitleTrackSchema] }),
    __metadata("design:type", Array)
], Episode.prototype, "subtitles", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.AudioTrackSchema] }),
    __metadata("design:type", Array)
], Episode.prototype, "audioTracks", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Episode.prototype, "viewCount", void 0);
exports.Episode = Episode = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Episode);
exports.EpisodeSchema = mongoose_1.SchemaFactory.createForClass(Episode);
exports.EpisodeSchema.index({ seasonId: 1, episodeNumber: 1 });
let Season = class Season {
};
exports.Season = Season;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Movie', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Season.prototype, "seriesId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Season.prototype, "seasonNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Season.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Season.prototype, "synopsis", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Season.prototype, "posterUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Season.prototype, "releaseYear", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Season.prototype, "episodeCount", void 0);
exports.Season = Season = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Season);
exports.SeasonSchema = mongoose_1.SchemaFactory.createForClass(Season);
exports.SeasonSchema.index({ seriesId: 1, seasonNumber: 1 });
//# sourceMappingURL=series.schema.js.map