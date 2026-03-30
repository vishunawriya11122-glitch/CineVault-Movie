import { Model } from 'mongoose';
import { AppVersion, AppVersionDocument } from './app-version.schema';
export declare class AppVersionService {
    private model;
    constructor(model: Model<AppVersionDocument>);
    getLatest(): Promise<AppVersion>;
    update(data: Partial<AppVersion>): Promise<AppVersion>;
}
