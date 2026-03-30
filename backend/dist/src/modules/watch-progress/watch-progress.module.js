"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatchProgressModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const watch_progress_controller_1 = require("./watch-progress.controller");
const watch_progress_service_1 = require("./watch-progress.service");
const watch_progress_schema_1 = require("../../schemas/watch-progress.schema");
let WatchProgressModule = class WatchProgressModule {
};
exports.WatchProgressModule = WatchProgressModule;
exports.WatchProgressModule = WatchProgressModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: watch_progress_schema_1.WatchProgress.name, schema: watch_progress_schema_1.WatchProgressSchema }])],
        controllers: [watch_progress_controller_1.WatchProgressController],
        providers: [watch_progress_service_1.WatchProgressService],
        exports: [watch_progress_service_1.WatchProgressService],
    })
], WatchProgressModule);
//# sourceMappingURL=watch-progress.module.js.map