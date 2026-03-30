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
exports.AppVersionSchema = exports.AppVersion = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let AppVersion = class AppVersion {
};
exports.AppVersion = AppVersion;
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 1 }),
    __metadata("design:type", Number)
], AppVersion.prototype, "versionCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: '1.0.0' }),
    __metadata("design:type", String)
], AppVersion.prototype, "versionName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], AppVersion.prototype, "forceUpdate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], AppVersion.prototype, "apkUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], AppVersion.prototype, "releaseNotes", void 0);
exports.AppVersion = AppVersion = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], AppVersion);
exports.AppVersionSchema = mongoose_1.SchemaFactory.createForClass(AppVersion);
//# sourceMappingURL=app-version.schema.js.map