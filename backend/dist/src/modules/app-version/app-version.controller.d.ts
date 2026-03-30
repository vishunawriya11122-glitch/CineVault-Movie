import { AppVersionService } from './app-version.service';
import { AppVersion } from './app-version.schema';
export declare class AppVersionController {
    private readonly service;
    constructor(service: AppVersionService);
    getLatest(): Promise<AppVersion>;
    update(body: Partial<AppVersion>): Promise<AppVersion>;
}
