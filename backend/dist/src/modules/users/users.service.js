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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../../schemas/user.schema");
let UsersService = class UsersService {
    constructor(userModel) {
        this.userModel = userModel;
    }
    async findById(id) {
        const user = await this.userModel.findById(id);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async findAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.userModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            this.userModel.countDocuments(),
        ]);
        return { users, total };
    }
    async updateProfile(userId, updates) {
        const user = await this.userModel.findByIdAndUpdate(userId, updates, { new: true });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async suspendUser(userId, reason) {
        const user = await this.userModel.findByIdAndUpdate(userId, { isSuspended: true, suspendReason: reason }, { new: true });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async unsuspendUser(userId) {
        const user = await this.userModel.findByIdAndUpdate(userId, { isSuspended: false, suspendReason: null }, { new: true });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async updateFcmToken(userId, token) {
        await this.userModel.findByIdAndUpdate(userId, {
            $addToSet: { fcmTokens: token },
        });
    }
    async removeFcmToken(userId, token) {
        await this.userModel.findByIdAndUpdate(userId, {
            $pull: { fcmTokens: token },
        });
    }
    async getStats() {
        const [total, suspended] = await Promise.all([
            this.userModel.countDocuments(),
            this.userModel.countDocuments({ isSuspended: true }),
        ]);
        return { total, active: total - suspended, suspended };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map