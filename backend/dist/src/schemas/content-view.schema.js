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
exports.ContentViewSchema = exports.ContentView = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ContentView = class ContentView {
};
exports.ContentView = ContentView;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ContentView.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ContentView.prototype, "contentId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['movie', 'episode'] }),
    __metadata("design:type", String)
], ContentView.prototype, "contentType", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ContentView.prototype, "seriesId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ContentView.prototype, "seasonId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ContentView.prototype, "deviceId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ContentView.prototype, "userEmail", void 0);
exports.ContentView = ContentView = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ContentView);
exports.ContentViewSchema = mongoose_1.SchemaFactory.createForClass(ContentView);
exports.ContentViewSchema.index({ userId: 1, contentId: 1 }, { unique: true });
exports.ContentViewSchema.index({ contentId: 1 });
exports.ContentViewSchema.index({ seriesId: 1 });
exports.ContentViewSchema.index({ seasonId: 1 });
exports.ContentViewSchema.index({ createdAt: -1 });
//# sourceMappingURL=content-view.schema.js.map