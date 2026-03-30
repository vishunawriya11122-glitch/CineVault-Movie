"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeSectionsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const home_sections_controller_1 = require("./home-sections.controller");
const home_sections_service_1 = require("./home-sections.service");
const home_section_schema_1 = require("../../schemas/home-section.schema");
const movie_schema_1 = require("../../schemas/movie.schema");
let HomeSectionsModule = class HomeSectionsModule {
};
exports.HomeSectionsModule = HomeSectionsModule;
exports.HomeSectionsModule = HomeSectionsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: home_section_schema_1.HomeSection.name, schema: home_section_schema_1.HomeSectionSchema },
                { name: movie_schema_1.Movie.name, schema: movie_schema_1.MovieSchema },
            ]),
        ],
        controllers: [home_sections_controller_1.HomeSectionsController],
        providers: [home_sections_service_1.HomeSectionsService],
        exports: [home_sections_service_1.HomeSectionsService],
    })
], HomeSectionsModule);
//# sourceMappingURL=home-sections.module.js.map