export interface AppNotification {
    _id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success' | 'error';
    isRead: boolean;
    userId: string;
    expiresAt?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
}

export interface User {
    _id: string;
    name: string;
    username: string;
    email: string;
    role: string;
}

export interface NotificationService {
    getNotifications: () => Promise<AppNotification[]>;
    getUnreadCount: () => Promise<number>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;
    createNotification: (notification: CreateNotificationData) => Promise<void>;
    getAllNotifications: () => Promise<AppNotification[]>;
    getUsers: (role?: string, search?: string) => Promise<User[]>;
    createNotificationForAll: (notification: Omit<CreateNotificationData, 'userId' | 'userIds'>) => Promise<void>;
    createNotificationByRole: (notification: Omit<CreateNotificationData, 'userId' | 'userIds'>, role: string) => Promise<void>;
    createNotificationFromTemplate: (templateName: string, userIds: string[], variables?: Record<string, unknown>) => Promise<void>;
}

export interface CreateNotificationData {
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success' | 'error';
    userId?: string;
    userIds?: string[];
    sendToAll?: boolean;
    expiresAt?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    count?: number;
    message?: string;
    affectedRows?: number;
}
