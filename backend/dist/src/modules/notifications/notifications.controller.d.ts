import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getAll(page?: number, limit?: number): Promise<{
        notifications: import("../../schemas/notification.schema").NotificationDocument[];
        total: number;
    }>;
    create(body: any, createdBy: string): Promise<import("../../schemas/notification.schema").NotificationDocument>;
    send(id: string): Promise<import("../../schemas/notification.schema").NotificationDocument>;
    delete(id: string): Promise<{
        message: string;
    }>;
}
