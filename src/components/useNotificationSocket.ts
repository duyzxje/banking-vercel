import { useEffect, useRef, useState, useCallback } from 'react';
import NotificationSocket, { NotificationSocketCallbacks } from './NotificationSocket';
import { Notification } from './NotificationTypes';

interface UseNotificationSocketReturn {
    isConnected: boolean;
    unreadCount: number;
    notifications: Notification[];
    connectionError: string | null;
    joinRoom: (room: string) => void;
    leaveRoom: (room: string) => void;
    showToast: (notification: Notification) => void;
}

const useNotificationSocket = (token: string | null): UseNotificationSocketReturn => {
    const [isConnected, setIsConnected] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const socketRef = useRef<NotificationSocket | null>(null);

    // Toast notification function
    const showToast = useCallback((notification: Notification) => {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50 transform transition-all duration-300 ease-in-out translate-x-full';

        // Get type icon and color
        const getTypeInfo = (type: string) => {
            switch (type) {
                case 'success':
                    return { icon: '✅', color: 'text-green-600' };
                case 'warning':
                    return { icon: '⚠️', color: 'text-yellow-600' };
                case 'error':
                    return { icon: '❌', color: 'text-red-600' };
                default:
                    return { icon: 'ℹ️', color: 'text-blue-600' };
            }
        };

        const typeInfo = getTypeInfo(notification.type);

        toast.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="text-xl">${typeInfo.icon}</div>
        <div class="flex-1">
          <h4 class="font-semibold text-gray-900 text-sm">${notification.title}</h4>
          <p class="text-gray-600 text-xs mt-1">${notification.content}</p>
          <div class="text-xs text-gray-400 mt-2">${new Date(notification.createdAt).toLocaleString('vi-VN')}</div>
        </div>
        <button class="text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
            toast.classList.add('translate-x-0');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('translate-x-0');
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }, []);

    useEffect(() => {
        if (token) {
            socketRef.current = new NotificationSocket(token);

            const callbacks: NotificationSocketCallbacks = {
                onConnectionStatusChange: (connected) => {
                    setIsConnected(connected);
                    if (connected) {
                        setConnectionError(null);
                    }
                },

                onConnectionError: (error) => {
                    setConnectionError(error.message || 'Connection error');
                    setIsConnected(false);
                },

                onNewNotification: (notification) => {
                    setNotifications(prev => [notification, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Show toast notification
                    showToast(notification);
                },

                onUnreadCountUpdate: (count) => {
                    setUnreadCount(count);
                },

                onNotificationRead: (notificationId) => {
                    setNotifications(prev =>
                        prev.map(notif =>
                            notif._id === notificationId
                                ? { ...notif, isRead: true }
                                : notif
                        )
                    );
                },

                onAllNotificationsRead: (count) => {
                    setNotifications(prev =>
                        prev.map(notif => ({ ...notif, isRead: true }))
                    );
                    setUnreadCount(0);
                },

                onNotificationUpdated: (notification) => {
                    setNotifications(prev =>
                        prev.map(notif =>
                            notif._id === notification._id ? notification : notif
                        )
                    );
                },

                onNotificationDeleted: (notificationId) => {
                    setNotifications(prev =>
                        prev.filter(notif => notif._id !== notificationId)
                    );
                },

                onSystemNotification: (notification) => {
                    // Show system notification as toast
                    showToast(notification);
                }
            };

            socketRef.current.setCallbacks(callbacks);
            socketRef.current.connect();

            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                }
            };
        }
    }, [token, showToast]);

    const joinRoom = useCallback((room: string) => {
        if (socketRef.current) {
            socketRef.current.joinRoom(room);
        }
    }, []);

    const leaveRoom = useCallback((room: string) => {
        if (socketRef.current) {
            socketRef.current.leaveRoom(room);
        }
    }, []);

    return {
        isConnected,
        unreadCount,
        notifications,
        connectionError,
        joinRoom,
        leaveRoom,
        showToast
    };
};

export default useNotificationSocket;
