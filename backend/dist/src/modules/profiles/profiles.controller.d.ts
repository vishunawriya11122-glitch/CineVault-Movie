import { ProfilesService } from './profiles.service';
export declare class ProfilesController {
    private readonly profilesService;
    constructor(profilesService: ProfilesService);
    getProfiles(userId: string): Promise<import("../../schemas/profile.schema").ProfileDocument[]>;
    createProfile(userId: string, body: {
        displayName: string;
        avatarUrl?: string;
        maturityRating?: string;
        pin?: string;
    }): Promise<import("../../schemas/profile.schema").ProfileDocument>;
    updateProfile(userId: string, profileId: string, body: {
        displayName?: string;
        avatarUrl?: string;
        maturityRating?: string;
        pin?: string;
    }): Promise<import("../../schemas/profile.schema").ProfileDocument>;
    deleteProfile(userId: string, profileId: string): Promise<{
        message: string;
    }>;
    verifyPin(profileId: string, pin: string): Promise<{
        valid: boolean;
    }>;
}
