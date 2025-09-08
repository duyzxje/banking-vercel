import { AppNotification, ApiResponse, User, CreateNotificationData } from './NotificationTypes';
import PushNotificationManager from './PushNotificationManager';

class NotificationServiceClass {
    private notifications: AppNotification[] = [];
    private listeners: ((notifications: AppNotification[]) => void)[] = [];
    private unreadCountListeners: ((count: number) => void)[] = [];
    private baseUrl = 'https://worktime-dux3.onrender.com/api';
    private pushManager: PushNotificationManager;

    constructor() {
        // Initialize push notification manager
        this.pushManager = new PushNotificationManager();

        // Load notifications from API instead of localStorage
        this.loadNotificationsFromAPI();
    }

    // Get auth headers
    private getAuthHeaders(): HeadersInit {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    // Load notifications from API
    private async loadNotificationsFromAPI(): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/notifications/user`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const result: ApiResponse<AppNotification[]> = await response.json();
                if (result.success && result.data) {
                    this.notifications = result.data;
                    this.notifyListeners();
                }
            } else {
                console.error('Failed to load notifications from API');
                // Fallback to demo data if API fails
                this.loadDemoNotifications();
            }
        } catch (error) {
            console.error('Error loading notifications from API:', error);
            // Fallback to demo data if API fails
            this.loadDemoNotifications();
        }
    }

    // Load demo notifications as fallback
    private loadDemoNotifications(): void {
        const demoNotifications: AppNotification[] = [
            {
                _id: 'demo-1',
                title: 'Chào mừng đến với hệ thống',
                content: 'Chào mừng bạn đến với hệ thống quản lý Giorlin!',
                type: 'info',
                isRead: false,
                userId: 'demo-user',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                _id: 'demo-2',
                title: 'Cập nhật hệ thống',
                content: 'Hệ thống đã được cập nhật với các tính năng mới.',
                type: 'success',
                isRead: false,
                userId: 'demo-user',
                isActive: true,
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                updatedAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
                _id: 'demo-3',
                title: 'Nhắc nhở chấm công',
                content: 'Đừng quên chấm công khi bắt đầu và kết thúc ca làm việc.',
                type: 'warning',
                isRead: true,
                userId: 'demo-user',
                isActive: true,
                createdAt: new Date(Date.now() - 7200000).toISOString(),
                updatedAt: new Date(Date.now() - 7200000).toISOString()
            }
        ];

        this.notifications = demoNotifications;
        this.notifyListeners();
    }
    // Save notifications to localStorage
    private saveNotifications(): void {
        try {
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Error saving notifications:', error);
        }
    }

    // Notify listeners
    private notifyListeners(): void {
        this.listeners.forEach(listener => listener([...this.notifications]));
        this.notifyUnreadCountListeners();
    }

    // Notify unread count listeners
    private notifyUnreadCountListeners(): void {
        const unreadCount = this.notifications.filter(n => !n.isRead).length;
        this.unreadCountListeners.forEach(listener => listener(unreadCount));
    }

    // Subscribe to notifications changes
    subscribe(listener: (notifications: AppNotification[]) => void): () => void {
        this.listeners.push(listener);
        // Immediately call with current notifications
        listener([...this.notifications]);

        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    // Subscribe to unread count changes
    subscribeToUnreadCount(listener: (count: number) => void): () => void {
        this.unreadCountListeners.push(listener);
        // Immediately call with current unread count
        const unreadCount = this.notifications.filter(n => !n.isRead).length;
        listener(unreadCount);

        // Return unsubscribe function
        return () => {
            const index = this.unreadCountListeners.indexOf(listener);
            if (index > -1) {
                this.unreadCountListeners.splice(index, 1);
            }
        };
    }

    // Get all notifications
    async getNotifications(): Promise<AppNotification[]> {
        try {
            const response = await fetch(`${this.baseUrl}/notifications/user`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const result: ApiResponse<AppNotification[]> = await response.json();
                if (result.success && result.data) {
                    this.notifications = result.data;
                    this.notifyListeners();
                    return result.data;
                }
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }

        return [...this.notifications];
    }

    // Get unread count
    async getUnreadCount(): Promise<number> {
        try {
            const response = await fetch(`${this.baseUrl}/notifications/user/count`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const result: ApiResponse<{ count: number }> = await response.json();
                if (result.success && result.count !== undefined) {
                    return result.count;
                }
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }

        return this.notifications.filter(n => !n.isRead).length;
    }

    // Mark notification as read
    async markAsRead(notificationId: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const result: ApiResponse<Notification> = await response.json();
                if (result.success && result.data) {
                    // Update local state
                    const notification = this.notifications.find(n => n._id === notificationId);
                    if (notification) {
                        notification.isRead = true;
                        notification.updatedAt = new Date().toISOString();
                        this.notifyListeners();
                    }
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            // Fallback to local update
            const notification = this.notifications.find(n => n._id === notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                notification.updatedAt = new Date().toISOString();
                this.notifyListeners();
            }
        }
    }

    // Mark all notifications as read
    async markAllAsRead(): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/notifications/user/mark-all-read`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const result: ApiResponse<{ affectedRows: number }> = await response.json();
                if (result.success) {
                    // Update all notifications to read
                    this.notifications.forEach(notification => {
                        if (!notification.isRead) {
                            notification.isRead = true;
                            notification.updatedAt = new Date().toISOString();
                        }
                    });
                    this.notifyListeners();
                }
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            // Fallback to local update
            this.notifications.forEach(notification => {
                if (!notification.isRead) {
                    notification.isRead = true;
                    notification.updatedAt = new Date().toISOString();
                }
            });
            this.notifyListeners();
        }
    }

    // Delete notification
    async deleteNotification(notificationId: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const result: ApiResponse<unknown> = await response.json();
                if (result.success) {
                    // Remove from local state
                    const index = this.notifications.findIndex(n => n._id === notificationId);
                    if (index > -1) {
                        this.notifications.splice(index, 1);
                        this.notifyListeners();
                    }
                }
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            // Fallback to local update
            const index = this.notifications.findIndex(n => n._id === notificationId);
            if (index > -1) {
                this.notifications.splice(index, 1);
                this.notifyListeners();
            }
        }
    }

    // Create new notification (admin only)
    async createNotification(notificationData: CreateNotificationData): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/notifications`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(notificationData)
            });

            if (response.ok) {
                const result: ApiResponse<AppNotification[]> = await response.json();
                if (result.success && result.data) {
                    // Add to local state
                    result.data.forEach(notification => {
                        this.notifications.unshift(notification);
                    });
                    this.notifyListeners();
                }
            }
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    // Get users for selection (admin only)
    async getUsers(role?: string, search?: string): Promise<User[]> {
        try {
            let url = `${this.baseUrl}/notifications/admin/users?`;
            if (role) url += `role=${role}&`;
            if (search) url += `search=${encodeURIComponent(search)}`;

            const response = await fetch(url, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const result: ApiResponse<User[]> = await response.json();
                if (result.success && result.data) {
                    return result.data;
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }

        return [];
    }

    // Create notification for all users
    async createNotificationForAll(notificationData: Omit<CreateNotificationData, 'userId' | 'userIds'>): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/notifications`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    ...notificationData,
                    sendToAll: true
                })
            });

            if (response.ok) {
                const result: ApiResponse<AppNotification[]> = await response.json();
                if (result.success && result.data) {
                    // Add to local state
                    result.data.forEach(notification => {
                        this.notifications.unshift(notification);
                    });
                    this.notifyListeners();
                }
            }
        } catch (error) {
            console.error('Error creating notification for all:', error);
        }
    }

    // Create notification by role
    async createNotificationByRole(notificationData: Omit<CreateNotificationData, 'userId' | 'userIds'>, role: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/notifications/by-role`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    ...notificationData,
                    role
                })
            });

            if (response.ok) {
                const result: ApiResponse<AppNotification[]> = await response.json();
                if (result.success && result.data) {
                    // Add to local state
                    result.data.forEach(notification => {
                        this.notifications.unshift(notification);
                    });
                    this.notifyListeners();
                }
            }
        } catch (error) {
            console.error('Error creating notification by role:', error);
        }
    }

    // Create notification from template
    async createNotificationFromTemplate(templateName: string, userIds: string[], variables?: Record<string, unknown>): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/notifications/from-template`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    templateName,
                    userIds,
                    variables
                })
            });

            if (response.ok) {
                const result: ApiResponse<AppNotification[]> = await response.json();
                if (result.success && result.data) {
                    // Add to local state
                    result.data.forEach(notification => {
                        this.notifications.unshift(notification);
                    });
                    this.notifyListeners();
                }
            }
        } catch (error) {
            console.error('Error creating notification from template:', error);
        }
    }

    // Get all notifications (admin only)
    async getAllNotifications(): Promise<AppNotification[]> {
        try {
            const response = await fetch(`${this.baseUrl}/notifications/admin/all`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const result: ApiResponse<AppNotification[]> = await response.json();
                if (result.success && result.data) {
                    return result.data;
                }
            }
        } catch (error) {
            console.error('Error fetching all notifications:', error);
        }

        return [];
    }

    // WebSocket event handlers
    handleNewNotification(notification: AppNotification): void {
        // Add new notification to the beginning of the list
        this.notifications.unshift(notification);
        this.notifyListeners();
    }

    handleUnreadCountUpdate(count: number): void {
        // Update unread count listeners directly
        this.unreadCountListeners.forEach(listener => listener(count));
    }

    handleNotificationRead(notificationId: string): void {
        const notification = this.notifications.find(n => n._id === notificationId);
        if (notification && !notification.isRead) {
            notification.isRead = true;
            notification.updatedAt = new Date().toISOString();
            this.notifyListeners();
        }
    }

    handleAllNotificationsRead(): void {
        // Mark all notifications as read
        this.notifications.forEach(notification => {
            if (!notification.isRead) {
                notification.isRead = true;
                notification.updatedAt = new Date().toISOString();
            }
        });
        this.notifyListeners();
    }

    handleNotificationUpdated(notification: AppNotification): void {
        const index = this.notifications.findIndex(n => n._id === notification._id);
        if (index > -1) {
            this.notifications[index] = notification;
            this.notifyListeners();
        }
    }

    handleNotificationDeleted(notificationId: string): void {
        const index = this.notifications.findIndex(n => n._id === notificationId);
        if (index > -1) {
            this.notifications.splice(index, 1);
            this.notifyListeners();
        }
    }

    // Get recent notifications (for non-admin users)
    async getRecentNotifications(limit: number = 3): Promise<AppNotification[]> {
        try {
            // Fetch all user notifications, then pick the latest N (including read)
            const response = await fetch(`${this.baseUrl}/notifications/user`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const result: ApiResponse<AppNotification[]> = await response.json();
                if (result.success && result.data) {
                    return result.data
                        .slice()
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .slice(0, limit);
                }
            }
        } catch (error) {
            console.error('Error fetching recent notifications:', error);
        }

        // Fallback to local data
        return this.notifications
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
    }

    // Simulate receiving new notifications (for demo purposes)
    simulateNewNotification(): void {
        const types: Array<'info' | 'success' | 'warning' | 'error'> = ['info', 'success', 'warning', 'error'];
        const titles = [
            'Giao dịch mới',
            'Chấm công thành công',
            'Nhắc nhở quan trọng',
            'Cập nhật hệ thống',
            'Thông báo bảo trì'
        ];
        const messages = [
            'Bạn có một giao dịch mới cần xem xét.',
            'Chấm công của bạn đã được ghi nhận thành công.',
            'Vui lòng kiểm tra thông tin cá nhân của bạn.',
            'Hệ thống đã được cập nhật với các tính năng mới.',
            'Hệ thống sẽ bảo trì vào cuối tuần này.'
        ];

        const randomType = types[Math.floor(Math.random() * types.length)];
        const randomTitle = titles[Math.floor(Math.random() * titles.length)];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        const newNotification: AppNotification = {
            _id: `demo-${Date.now()}`,
            title: randomTitle,
            content: randomMessage,
            type: randomType,
            isRead: false,
            userId: 'demo-user',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.handleNewNotification(newNotification);
    }

    // Push Notification Methods
    async initializePushNotifications(): Promise<boolean> {
        try {
            return await this.pushManager.initialize();
        } catch (error) {
            console.error('Failed to initialize push notifications:', error);
            return false;
        }
    }

    async subscribeToPushNotifications(): Promise<boolean> {
        try {
            await this.pushManager.subscribe();
            return true;
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            return false;
        }
    }

    async unsubscribeFromPushNotifications(): Promise<boolean> {
        try {
            await this.pushManager.unsubscribe();
            return true;
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error);
            return false;
        }
    }

    async testPushNotification(): Promise<boolean> {
        try {
            await this.pushManager.testPushNotification();
            return true;
        } catch (error) {
            console.error('Failed to send test push notification:', error);
            return false;
        }
    }

    getPushNotificationStatus(): {
        isSubscribed: boolean;
        permission: NotificationPermission;
        subscription: PushSubscription | null;
    } {
        return this.pushManager.getSubscriptionStatus();
    }

    // Enhanced notification creation with push support
    async createNotificationWithPush(notification: CreateNotificationData): Promise<void> {
        try {
            // Create notification via API
            await this.createNotification(notification);

            // Send push notification if user is subscribed
            const pushStatus = this.getPushNotificationStatus();
            if (pushStatus.isSubscribed && pushStatus.permission === 'granted') {
                // The push notification will be handled by the backend
                // when the notification is created via API
                console.log('Push notification will be sent by backend');
            }
        } catch (error) {
            console.error('Failed to create notification with push:', error);
            throw error;
        }
    }

    // Show local notification for demo
    showLocalNotification(title: string, body: string): void {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'worktime-notification',
                requireInteraction: false
            });
        }
    }
}

// Export singleton instance
const notificationService = new NotificationServiceClass();
export default notificationService;
