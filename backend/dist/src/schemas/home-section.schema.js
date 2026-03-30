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
exports.HomeSectionSchema = exports.HomeSection = exports.TabSection = exports.CardSize = exports.SectionType = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
var SectionType;
(function (SectionType) {
    SectionType["STANDARD"] = "standard";
    SectionType["LARGE_CARD"] = "large_card";
    SectionType["MID_BANNER"] = "mid_banner";
    SectionType["TRENDING"] = "trending";
})(SectionType || (exports.SectionType = SectionType = {}));
var CardSize;
(function (CardSize) {
    CardSize["SMALL"] = "small";
    CardSize["MEDIUM"] = "medium";
    CardSize["LARGE"] = "large";
})(CardSize || (exports.CardSize = CardSize = {}));
var TabSection;
(function (TabSection) {
    TabSection["HOME"] = "home";
    TabSection["MOVIES"] = "movies";
    TabSection["SHOWS"] = "shows";
    TabSection["ANIME"] = "anime";
})(TabSection || (exports.TabSection = TabSection = {}));
let HomeSection = class HomeSection {
};
exports.HomeSection = HomeSection;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], HomeSection.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeSection.prototype, "slug", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: SectionType, default: SectionType.STANDARD }),
    __metadata("design:type", String)
], HomeSection.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [mongoose_2.Types.ObjectId], ref: 'Movie' }),
    __metadata("design:type", Array)
], HomeSection.prototype, "contentIds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], HomeSection.prototype, "displayOrder", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], HomeSection.prototype, "isVisible", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], HomeSection.prototype, "isSystemManaged", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeSection.prototype, "contentType", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeSection.prototype, "genre", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeSection.prototype, "sortBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 20 }),
    __metadata("design:type", Number)
], HomeSection.prototype, "maxItems", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: CardSize, default: CardSize.SMALL }),
    __metadata("design:type", String)
], HomeSection.prototype, "cardSize", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], HomeSection.prototype, "showViewMore", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'View More' }),
    __metadata("design:type", String)
], HomeSection.prototype, "viewMoreText", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeSection.prototype, "bannerImageUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], HomeSection.prototype, "showTrendingNumbers", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], HomeSection.prototype, "tags", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], HomeSection.prototype, "contentTypes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: TabSection, default: TabSection.HOME }),
    __metadata("design:type", String)
], HomeSection.prototype, "section", void 0);
exports.HomeSection = HomeSection = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], HomeSection);
exports.HomeSectionSchema = mongoose_1.SchemaFactory.createForClass(HomeSection);
exports.HomeSectionSchema.index({ displayOrder: 1, isVisible: 1, section: 1 });
exports.HomeSectionSchema.index({ type: 1 });
//# sourceMappingURL=home-section.schema.js.map