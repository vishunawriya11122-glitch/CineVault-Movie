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
exports.MovieSchema = exports.Movie = exports.StreamingSourceSchema = exports.StreamingSource = exports.CastMemberSchema = exports.CastMember = exports.ContentRating = exports.ContentType = exports.ContentStatus = void 0;
const mongoose_1 = require("@nestjs/mongoose");
var ContentStatus;
(function (ContentStatus) {
    ContentStatus["DRAFT"] = "draft";
    ContentStatus["PUBLISHED"] = "published";
    ContentStatus["SCHEDULED"] = "scheduled";
    ContentStatus["ARCHIVED"] = "archived";
})(ContentStatus || (exports.ContentStatus = ContentStatus = {}));
var ContentType;
(function (ContentType) {
    ContentType["MOVIE"] = "movie";
    ContentType["WEB_SERIES"] = "web_series";
    ContentType["TV_SHOW"] = "tv_show";
    ContentType["DOCUMENTARY"] = "documentary";
    ContentType["SHORT_FILM"] = "short_film";
    ContentType["ANIME"] = "anime";
})(ContentType || (exports.ContentType = ContentType = {}));
var ContentRating;
(function (ContentRating) {
    ContentRating["U"] = "U";
    ContentRating["UA"] = "UA";
    ContentRating["A"] = "A";
    ContentRating["S"] = "S";
})(ContentRating || (exports.ContentRating = ContentRating = {}));
let CastMember = class CastMember {
};
exports.CastMember = CastMember;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CastMember.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CastMember.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CastMember.prototype, "character", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CastMember.prototype, "photoUrl", void 0);
exports.CastMember = CastMember = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], CastMember);
exports.CastMemberSchema = mongoose_1.SchemaFactory.createForClass(CastMember);
let StreamingSource = class StreamingSource {
};
exports.StreamingSource = StreamingSource;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StreamingSource.prototype, "label", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StreamingSource.prototype, "url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StreamingSource.prototype, "quality", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], StreamingSource.prototype, "priority", void 0);
exports.StreamingSource = StreamingSource = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], StreamingSource);
exports.StreamingSourceSchema = mongoose_1.SchemaFactory.createForClass(StreamingSource);
let Movie = class Movie {
};
exports.Movie = Movie;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Movie.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "alternateTitle", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Movie.prototype, "synopsis", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ContentType, required: true }),
    __metadata("design:type", String)
], Movie.prototype, "contentType", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], Movie.prototype, "genres", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], Movie.prototype, "languages", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ContentRating, default: ContentRating.UA }),
    __metadata("design:type", String)
], Movie.prototype, "contentRating", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ContentStatus, default: ContentStatus.DRAFT }),
    __metadata("design:type", String)
], Movie.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Movie.prototype, "releaseYear", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "country", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Movie.prototype, "duration", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "director", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "studio", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.CastMemberSchema] }),
    __metadata("design:type", Array)
], Movie.prototype, "cast", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "posterUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "bannerUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "logoUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "trailerUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "cbfcCertificateUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.StreamingSourceSchema] }),
    __metadata("design:type", Array)
], Movie.prototype, "streamingSources", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Movie.prototype, "rating", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0, min: 0, max: 10 }),
    __metadata("design:type", Number)
], Movie.prototype, "starRating", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Movie.prototype, "voteCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Movie.prototype, "viewCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Movie.prototype, "popularityScore", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "imdbId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "tmdbId", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], Movie.prototype, "tags", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "platformOrigin", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Movie.prototype, "scheduledPublishDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Movie.prototype, "isFeatured", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "rankingLabel", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "videoQuality", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "hlsUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'none' }),
    __metadata("design:type", String)
], Movie.prototype, "hlsStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Movie.prototype, "driveFolderUrl", void 0);
exports.Movie = Movie = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Movie);
exports.MovieSchema = mongoose_1.SchemaFactory.createForClass(Movie);
exports.MovieSchema.index({ title: 'text', alternateTitle: 'text', synopsis: 'text' });
exports.MovieSchema.index({ status: 1 });
exports.MovieSchema.index({ contentType: 1 });
exports.MovieSchema.index({ genres: 1 });
exports.MovieSchema.index({ languages: 1 });
exports.MovieSchema.index({ releaseYear: -1 });
exports.MovieSchema.index({ popularityScore: -1 });
exports.MovieSchema.index({ rating: -1 });
exports.MovieSchema.index({ createdAt: -1 });
//# sourceMappingURL=movie.schema.js.map