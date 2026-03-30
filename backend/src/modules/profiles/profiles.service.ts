import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Profile, ProfileDocument } from '../../schemas/profile.schema';
import { User, UserDocument } from '../../schemas/user.schema';

const MAX_PROFILES = 5;

@Injectable()
export class ProfilesService {
  constructor(
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getProfiles(userId: string): Promise<ProfileDocument[]> {
    return this.profileModel.find({ userId: new Types.ObjectId(userId), isActive: true });
  }

  async createProfile(
    userId: string,
    data: { displayName: string; avatarUrl?: string; maturityRating?: string; pin?: string },
  ): Promise<ProfileDocument> {
    const count = await this.profileModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });
    if (count >= MAX_PROFILES) {
      throw new BadRequestException(`Maximum of ${MAX_PROFILES} profiles allowed per account`);
    }

    const profileData: any = {
      userId: new Types.ObjectId(userId),
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      maturityRating: data.maturityRating,
    };

    if (data.pin) {
      profileData.pin = await bcrypt.hash(data.pin, 10);
    }

    const profile = await this.profileModel.create(profileData);
    await this.userModel.findByIdAndUpdate(userId, {
      $push: { profiles: profile._id },
    });

    return profile;
  }

  async updateProfile(
    userId: string,
    profileId: string,
    updates: { displayName?: string; avatarUrl?: string; maturityRating?: string; pin?: string },
  ): Promise<ProfileDocument> {
    const updateData: any = { ...updates };
    if (updates.pin) {
      updateData.pin = await bcrypt.hash(updates.pin, 10);
    }

    const profile = await this.profileModel.findOneAndUpdate(
      { _id: profileId, userId: new Types.ObjectId(userId) },
      updateData,
      { new: true },
    );
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async deleteProfile(userId: string, profileId: string): Promise<void> {
    const result = await this.profileModel.findOneAndUpdate(
      { _id: profileId, userId: new Types.ObjectId(userId) },
      { isActive: false },
    );
    if (!result) throw new NotFoundException('Profile not found');
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { profiles: new Types.ObjectId(profileId) },
    });
  }

  async verifyPin(profileId: string, pin: string): Promise<boolean> {
    const profile = await this.profileModel.findById(profileId).select('+pin');
    if (!profile || !profile.pin) return true; // no pin set
    return bcrypt.compare(pin, profile.pin);
  }
}
