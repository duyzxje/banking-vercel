import { useState, useEffect, useCallback } from 'react';
import PushNotificationManager from './PushNotificationManager';

const usePushNotifications = () => {
    const [pushManager] = useState(() => new PushNotificationManager());
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Khởi tạo push manager
    useEffect(() => {
        const initialize = async () => {
            try {
                setIsLoading(true);

                // Register service worker first
                await pushManager.registerServiceWorker();

                const success = await pushManager.initialize();
                if (success) {
                    const status = pushManager.getSubscriptionStatus();
                    setIsSubscribed(status.isSubscribed);
                    setPermission(status.permission);
                    setIsInitialized(true);
                }
            } catch (error) {
                console.error('Failed to initialize push notifications:', error);
                setError(error instanceof Error ? error.message : 'Failed to initialize');
            } finally {
                setIsLoading(false);
            }
        };

        initialize();
    }, [pushManager]);

    // Subscribe to push notifications
    const subscribe = useCallback(async (): Promise<boolean> => {
        try {
            setIsLoading(true);
            setError(null);

            await pushManager.subscribe();
            setIsSubscribed(true);
            setPermission('granted');

            return true;
        } catch (error) {
            console.error('Failed to subscribe:', error);
            setError(error instanceof Error ? error.message : 'Failed to subscribe');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [pushManager]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        try {
            setIsLoading(true);
            setError(null);

            await pushManager.unsubscribe();
            setIsSubscribed(false);

            return true;
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
            setError(error instanceof Error ? error.message : 'Failed to unsubscribe');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [pushManager]);

    // Test push notification
    const testPush = useCallback(async (): Promise<boolean> => {
        try {
            setIsLoading(true);
            setError(null);

            await pushManager.testPushNotification();
            return true;
        } catch (error) {
            console.error('Failed to send test notification:', error);
            setError(error instanceof Error ? error.message : 'Failed to send test notification');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [pushManager]);

    // Check if push notifications are supported
    const isSupported = useCallback((): boolean => {
        return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    }, []);

    // Get permission status
    const getPermissionStatus = useCallback((): NotificationPermission => {
        if (!('Notification' in window)) {
            return 'denied';
        }
        return Notification.permission;
    }, []);

    // Request permission
    const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
        if (!('Notification' in window)) {
            throw new Error('Notifications not supported');
        }

        const newPermission = await Notification.requestPermission();
        setPermission(newPermission);
        return newPermission;
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Refresh status
    const refreshStatus = useCallback(() => {
        if (isInitialized) {
            const status = pushManager.getSubscriptionStatus();
            setIsSubscribed(status.isSubscribed);
            setPermission(status.permission);
        }
    }, [pushManager, isInitialized]);

    return {
        // State
        isInitialized,
        isSubscribed,
        permission,
        isLoading,
        error,

        // Actions
        subscribe,
        unsubscribe,
        testPush,
        requestPermission,
        clearError,
        refreshStatus,

        // Utilities
        isSupported: isSupported(),
        getPermissionStatus,

        // Manager instance (for advanced usage)
        pushManager
    };
};

export default usePushNotifications;
