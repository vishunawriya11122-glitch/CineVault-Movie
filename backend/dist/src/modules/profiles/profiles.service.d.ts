import { Model } from 'mongoose';
import { ProfileDocument } from '../../schemas/profile.schema';
import { UserDocument } from '../../schemas/user.schema';
export declare class ProfilesService {
    private profileModel;
    private userModel;
    constructor(profileModel: Model<ProfileDocument>, userModel: Model<UserDocument>);
    getProfiles(userId: string): Promise<ProfileDocument[]>;
    createProfile(userId: string, data: {
        displayName: string;
        avatarUrl?: string;
        maturityRating?: string;
        pin?: string;
    }): Promise<ProfileDocument>;
    updateProfile(userId: string, profileId: string, updates: {
        displayName?: string;
        avatarUrl?: string;
        maturityRating?: string;
        pin?: string;
    }): Promise<ProfileDocument>;
    deleteProfile(userId: string, profileId: string): Promise<void>;
    verifyPin(profileId: string, pin: string): Promise<boolean>;
}
