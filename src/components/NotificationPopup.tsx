'use client';

import { useState, useEffect } from 'react';
import { X, Bell, Check, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Notification } from './NotificationTypes';
import NotificationService from './NotificationService';
import useNotificationSocket from './useNotificationSocket';

interface NotificationPopupProps {
    isOpen: boolean;
    onClose: () => void;
    isAdmin?: boolean;
}

export default function NotificationPopup({ isOpen, onClose, isAdmin = false }: NotificationPopupProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [shouldAnimate, setShouldAnimate] = useState(false);

    // WebSocket integration
    const token = localStorage.getItem('token');
    const {
        isConnected: socketConnected,
        unreadCount: socketUnreadCount,
        notifications: socketNotifications,
        connectionError: socketError
    } = useNotificationSocket(token);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            // Small delay to ensure element is rendered before animation
            const timer = setTimeout(() => {
                setShouldAnimate(true);
            }, 10);

            const loadNotifications = async () => {
                setIsLoading(true);
                try {
                    const data = await NotificationService.getNotifications();
                    setNotifications(data);
                } catch (error) {
                    console.error('Error loading notifications:', error);
                } finally {
                    setIsLoading(false);
                }
            };

            loadNotifications();

            // Subscribe to notification changes
            const unsubscribe = NotificationService.subscribe((updatedNotifications) => {
                setNotifications(updatedNotifications);
            });

            return () => {
                clearTimeout(timer);
                unsubscribe();
            };
        } else {
            setShouldAnimate(false);
            // Delay hiding to allow animation to complete
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Sync WebSocket notifications with local state
    useEffect(() => {
        if (socketNotifications.length > 0) {
            setNotifications(socketNotifications);
        }
    }, [socketNotifications]);

    // Handle close with animation
    const handleClose = () => {
        onClose();
    };

    const handleNotificationClick = async (notification: Notification) => {
        try {
            if (!notification.isRead) {
                await NotificationService.markAsRead(notification._id);
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await NotificationService.markAllAsRead();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const handleDeleteNotification = async (notificationId: string) => {
        try {
            await NotificationService.deleteNotification(notificationId);
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    const getNotificationBgColor = (type: string) => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200';
            case 'error':
                return 'bg-red-50 border-red-200';
            default:
                return 'bg-blue-50 border-blue-200';
        }
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) {
            return 'Vừa xong';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes} phút trước`;
        } else if (diffInMinutes < 1440) {
            const hours = Math.floor(diffInMinutes / 60);
            return `${hours} giờ trước`;
        } else {
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    if (!isVisible) return null;

    return (
        <>
            {/* Backdrop - Transparent */}
            <div
                className="fixed inset-0 z-40"
                onClick={handleClose}
            />

            {/* Popup */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${shouldAnimate ? 'translate-x-0' : 'translate-x-full'
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleClose}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Bell className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Thông báo</h2>
                        {notifications.filter(n => !n.isRead).length > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                {notifications.filter(n => !n.isRead).length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        {notifications.filter(n => !n.isRead).length > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                            >
                                Đọc tất cả
                            </button>
                        )}
                    </div>
                </div>

                {/* WebSocket Error Display */}
                {socketError && (
                    <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                        <div className="flex items-center space-x-2">
                            <WifiOff className="h-4 w-4 text-red-500" />
                            <span className="text-xs text-red-600">{socketError}</span>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <Bell className="h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 text-center">Không có thông báo nào</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {notifications.map((notification, index) => (
                                <div
                                    key={notification._id}
                                    className={`p-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer ${!notification.isRead ? 'bg-blue-50/30 border-l-4 border-l-blue-500' : ''
                                        } ${index === 0 && !notification.isRead ? 'animate-pulse' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'
                                                        }`}>
                                                        {notification.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {notification.content}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        {formatDateTime(notification.createdAt)}
                                                    </p>
                                                </div>
                                                {isAdmin && (
                                                    <div className="flex items-center space-x-1 ml-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteNotification(notification._id);
                                                            }}
                                                            className="p-1 hover:bg-red-100 rounded-full transition-colors"
                                                            title="Xóa thông báo"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - Only show for admin */}
                {isAdmin && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <button
                            onClick={() => {
                                // Close popup and switch to home tab to show notification creation form
                                onClose();
                                // Trigger a custom event to switch to home tab
                                window.dispatchEvent(new CustomEvent('switchToHomeTab'));
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                        >
                            Thêm thông báo mới
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
