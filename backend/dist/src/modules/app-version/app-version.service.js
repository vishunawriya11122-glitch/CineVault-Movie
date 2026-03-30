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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppVersionService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const app_version_schema_1 = require("./app-version.schema");
let AppVersionService = class AppVersionService {
    constructor(model) {
        this.model = model;
    }
    async getLatest() {
        let doc = await this.model.findOne().sort({ versionCode: -1 }).exec();
        if (!doc) {
            doc = await this.model.create({
                versionCode: 1,
                versionName: '1.0.0',
                forceUpdate: false,
                apkUrl: '',
                releaseNotes: 'Initial release',
            });
        }
        return doc;
    }
    async update(data) {
        const doc = await this.model.findOne().sort({ versionCode: -1 }).exec();
        if (doc) {
            Object.assign(doc, data);
            return doc.save();
        }
        return this.model.create(data);
    }
};
exports.AppVersionService = AppVersionService;
exports.AppVersionService = AppVersionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(app_version_schema_1.AppVersion.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], AppVersionService);
//# sourceMappingURL=app-version.service.js.map