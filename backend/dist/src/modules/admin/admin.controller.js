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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const user_schema_1 = require("../../schemas/user.schema");
const admin_log_schema_1 = require("../../schemas/admin-log.schema");
const watch_progress_schema_1 = require("../../schemas/watch-progress.schema");
let AdminController = class AdminController {
    constructor(userModel, adminLogModel, watchProgressModel) {
        this.userModel = userModel;
        this.adminLogModel = adminLogModel;
        this.watchProgressModel = watchProgressModel;
    }
    async getUsers(page = 1, limit = 20, search) {
        const skip = (Number(page) - 1) * Number(limit);
        const filter = search
            ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
            : {};
        const [users, total] = await Promise.all([
            this.userModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
                .select('name email role authProvider createdAt lastActiveAt isSuspended deviceInfo'),
            this.userModel.countDocuments(filter),
        ]);
        return { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
    }
    async getUser(id) {
        return this.userModel.findById(id).select('-password -passwordResetToken');
    }
    async suspendUser(id, reason, admin) {
        const user = await this.userModel.findByIdAndUpdate(id, { isSuspended: true, suspendReason: reason }, { new: true });
        await this.adminLogModel.create({
            adminId: admin.userId,
            adminEmail: admin.email,
            action: 'suspend_user',
            resource: 'user',
            resourceId: id,
            details: { reason },
        });
        return user;
    }
    async unsuspendUser(id, admin) {
        const user = await this.userModel.findByIdAndUpdate(id, { isSuspended: false, suspendReason: null }, { new: true });
        await this.adminLogModel.create({
            adminId: admin.userId,
            adminEmail: admin.email,
            action: 'unsuspend_user',
            resource: 'user',
            resourceId: id,
        });
        return user;
    }
    async getLogs(page = 1, limit = 50) {
        const skip = (Number(page) - 1) * Number(limit);
        const [logs, total] = await Promise.all([
            this.adminLogModel.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            this.adminLogModel.countDocuments(),
        ]);
        return { logs, total };
    }
    async getUserWatchHistory(userId, page = 1, limit = 20) {
        const skip = (Number(page) - 1) * Number(limit);
        const filter = { userId: new mongoose_2.Types.ObjectId(userId) };
        const [items, total] = await Promise.all([
            this.watchProgressModel
                .find(filter)
                .sort({ lastWatchedAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            this.watchProgressModel.countDocuments(filter),
        ]);
        return { items, total, page: Number(page) };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('users'),
    (0, swagger_1.ApiOperation)({ summary: 'List all users (Admin)' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user details (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/suspend'),
    (0, swagger_1.ApiOperation)({ summary: 'Suspend a user (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "suspendUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/unsuspend'),
    (0, swagger_1.ApiOperation)({ summary: 'Unsuspend a user (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "unsuspendUser", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, swagger_1.ApiOperation)({ summary: 'Get admin audit logs' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Get)('users/:id/watch-history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get watch history for a specific user (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUserWatchHistory", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Controller)('admin'),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(admin_log_schema_1.AdminLog.name)),
    __param(2, (0, mongoose_1.InjectModel)(watch_progress_schema_1.WatchProgress.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], AdminController);
//# sourceMappingURL=admin.controller.js.map