import { BannersService } from './banners.service';
export declare class BannersController {
    private readonly bannersService;
    constructor(bannersService: BannersService);
    getActive(section?: string): Promise<any[]>;
    getAll(section?: string): Promise<import("../../schemas/banner.schema").BannerDocument[]>;
    getTestUrls(): Promise<{
        id: any;
        title: any;
        imageUrl: any;
        imageUrlType: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";
        imageUrlLength: any;
    }[]>;
    create(body: any): Promise<import("../../schemas/banner.schema").BannerDocument>;
    update(id: string, body: any): Promise<import("../../schemas/banner.schema").BannerDocument>;
    delete(id: string): Promise<{
        message: string;
    }>;
    reorder(orderedIds: string[]): Promise<{
        message: string;
    }>;
}
