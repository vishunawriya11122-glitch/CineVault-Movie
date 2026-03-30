import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '../../schemas/notification.schema';
import { UserDocument } from '../../schemas/user.schema';
export declare class NotificationsService {
    private notificationModel;
    private userModel;
    constructor(notificationModel: Model<NotificationDocument>, userModel: Model<UserDocument>);
    create(data: Partial<Notification>): Promise<NotificationDocument>;
    getAll(page?: number, limit?: number): Promise<{
        notifications: NotificationDocument[];
        total: number;
    }>;
    send(notificationId: string): Promise<NotificationDocument>;
    delete(id: string): Promise<void>;
}
