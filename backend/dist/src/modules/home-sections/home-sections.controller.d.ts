import { HomeSectionsService } from './home-sections.service';
export declare class HomeSectionsController {
    private readonly homeSectionsService;
    constructor(homeSectionsService: HomeSectionsService);
    getFeed(section?: string): Promise<any[]>;
    getAll(section?: string): Promise<import("../../schemas/home-section.schema").HomeSectionDocument[]>;
    create(body: any): Promise<import("../../schemas/home-section.schema").HomeSectionDocument>;
    update(id: string, body: any): Promise<import("../../schemas/home-section.schema").HomeSectionDocument>;
    delete(id: string): Promise<{
        message: string;
    }>;
    reorder(orderedIds: string[]): Promise<{
        message: string;
    }>;
    seedDefaults(): Promise<{
        created: number;
        message: string;
    }>;
    addContent(id: string, movieIds: string[]): Promise<import("../../schemas/home-section.schema").HomeSectionDocument>;
    removeContent(id: string, movieIds: string[]): Promise<import("../../schemas/home-section.schema").HomeSectionDocument>;
}
