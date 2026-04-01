import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { HomeSection, HomeSectionDocument } from '../../schemas/home-section.schema';
import { MovieDocument } from '../../schemas/movie.schema';
export declare class HomeSectionsService implements OnModuleInit {
    private sectionModel;
    private movieModel;
    private readonly logger;
    constructor(sectionModel: Model<HomeSectionDocument>, movieModel: Model<MovieDocument>);
    onModuleInit(): Promise<void>;
    autoReleaseUpcoming(): Promise<void>;
    getHomeFeed(section?: string): Promise<any[]>;
    getAll(section?: string): Promise<HomeSectionDocument[]>;
    create(data: Partial<HomeSection>): Promise<HomeSectionDocument>;
    update(id: string, data: Partial<HomeSection>): Promise<HomeSectionDocument>;
    delete(id: string): Promise<void>;
    reorder(orderedIds: string[]): Promise<void>;
    addContent(sectionId: string, movieIds: string[]): Promise<HomeSectionDocument>;
    removeContent(sectionId: string, movieIds: string[]): Promise<HomeSectionDocument>;
    seedRecentlyAdded(): Promise<{
        created: number;
        message: string;
    }>;
}
