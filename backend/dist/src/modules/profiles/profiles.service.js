"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = require("bcryptjs");
const profile_schema_1 = require("../../schemas/profile.schema");
const user_schema_1 = require("../../schemas/user.schema");
const MAX_PROFILES = 5;
let ProfilesService = class ProfilesService {
    constructor(profileModel, userModel) {
        this.profileModel = profileModel;
        this.userModel = userModel;
    }
    async getProfiles(userId) {
        return this.profileModel.find({ userId: new mongoose_2.Types.ObjectId(userId), isActive: true });
    }
    async createProfile(userId, data) {
        const count = await this.profileModel.countDocuments({
            userId: new mongoose_2.Types.ObjectId(userId),
            isActive: true,
        });
        if (count >= MAX_PROFILES) {
            throw new common_1.BadRequestException(`Maximum of ${MAX_PROFILES} profiles allowed per account`);
        }
        const profileData = {
            userId: new mongoose_2.Types.ObjectId(userId),
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
    async updateProfile(userId, profileId, updates) {
        const updateData = { ...updates };
        if (updates.pin) {
            updateData.pin = await bcrypt.hash(updates.pin, 10);
        }
        const profile = await this.profileModel.findOneAndUpdate({ _id: profileId, userId: new mongoose_2.Types.ObjectId(userId) }, updateData, { new: true });
        if (!profile)
            throw new common_1.NotFoundException('Profile not found');
        return profile;
    }
    async deleteProfile(userId, profileId) {
        const result = await this.profileModel.findOneAndUpdate({ _id: profileId, userId: new mongoose_2.Types.ObjectId(userId) }, { isActive: false });
        if (!result)
            throw new common_1.NotFoundException('Profile not found');
        await this.userModel.findByIdAndUpdate(userId, {
            $pull: { profiles: new mongoose_2.Types.ObjectId(profileId) },
        });
    }
    async verifyPin(profileId, pin) {
        const profile = await this.profileModel.findById(profileId).select('+pin');
        if (!profile || !profile.pin)
            return true;
        return bcrypt.compare(pin, profile.pin);
    }
};
exports.ProfilesService = ProfilesService;
exports.ProfilesService = ProfilesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(profile_schema_1.Profile.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], ProfilesService);
//# sourceMappingURL=profiles.service.js.map