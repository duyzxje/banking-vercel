import { io, Socket } from 'socket.io-client';

export interface NotificationSocketCallbacks {
    onConnectionStatusChange?: (isConnected: boolean) => void;
    onConnectionError?: (error: any) => void;
    onNewNotification?: (notification: any) => void;
    onUnreadCountUpdate?: (count: number) => void;
    onNotificationRead?: (notificationId: string) => void;
    onAllNotificationsRead?: (count: number) => void;
    onNotificationUpdated?: (notification: any) => void;
    onNotificationDeleted?: (notificationId: string) => void;
    onSystemNotification?: (notification: any) => void;
    onConnectionStatus?: (status: string) => void;
}

class NotificationSocket {
    private token: string;
    private socket: Socket | null = null;
    private isConnected: boolean = false;
    private callbacks: NotificationSocketCallbacks = {};
    private baseUrl: string;

    constructor(token: string, baseUrl: string = 'https://worktime-dux3.onrender.com') {
        this.token = token;
        this.baseUrl = baseUrl;
    }

    connect() {
        if (this.socket) {
            this.disconnect();
        }

        this.socket = io(this.baseUrl, {
            auth: {
                token: this.token
            },
            transports: ['websocket', 'polling'],
            timeout: 20000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.setupEventListeners();
    }

    private setupEventListeners() {
        if (!this.socket) return;

        // Kết nối thành công
        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            this.isConnected = true;
            this.callbacks.onConnectionStatusChange?.(true);
        });

        // Mất kết nối
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from WebSocket server:', reason);
            this.isConnected = false;
            this.callbacks.onConnectionStatusChange?.(false);
        });

        // Lỗi kết nối
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.callbacks.onConnectionError?.(error);
        });

        // Thông báo mới
        this.socket.on('new_notification', (data) => {
            console.log('New notification received:', data);
            this.callbacks.onNewNotification?.(data.data);
        });

        // Cập nhật số lượng thông báo chưa đọc
        this.socket.on('unread_count_update', (data) => {
            console.log('Unread count updated:', data);
            this.callbacks.onUnreadCountUpdate?.(data.data.count);
        });

        // Thông báo đã đọc
        this.socket.on('notification_read', (data) => {
            console.log('Notification read:', data);
            this.callbacks.onNotificationRead?.(data.data.notificationId);
        });

        // Tất cả thông báo đã đọc
        this.socket.on('all_notifications_read', (data) => {
            console.log('All notifications read:', data);
            this.callbacks.onAllNotificationsRead?.(data.data.count);
        });

        // Thông báo được cập nhật
        this.socket.on('notification_updated', (data) => {
            console.log('Notification updated:', data);
            this.callbacks.onNotificationUpdated?.(data.data);
        });

        // Thông báo bị xóa
        this.socket.on('notification_deleted', (data) => {
            console.log('Notification deleted:', data);
            this.callbacks.onNotificationDeleted?.(data.data.notificationId);
        });

        // Thông báo hệ thống
        this.socket.on('system_notification', (data) => {
            console.log('System notification:', data);
            this.callbacks.onSystemNotification?.(data.data);
        });

        // Trạng thái kết nối
        this.socket.on('connection_status', (data) => {
            console.log('Connection status:', data);
            this.callbacks.onConnectionStatus?.(data.data.status);
        });
    }

    // Gửi event tới server
    joinRoom(room: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('join_notification_room', { room });
        }
    }

    leaveRoom(room: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('leave_notification_room', { room });
        }
    }

    // Ngắt kết nối
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    // Set callbacks
    setCallbacks(callbacks: NotificationSocketCallbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // Get connection status
    getConnectionStatus(): boolean {
        return this.isConnected;
    }

    // Update token
    updateToken(newToken: string) {
        this.token = newToken;
        if (this.socket) {
            this.socket.auth = { token: this.token };
        }
    }
}

export default NotificationSocket;
