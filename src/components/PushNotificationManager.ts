// PushNotificationManager Class
class PushNotificationManager {
    private registration: ServiceWorkerRegistration | null = null;
    private subscription: PushSubscription | null = null;
    private vapidPublicKey: string | null = null;

    // Khởi tạo push notification
    async initialize(): Promise<boolean> {
        try {
            // Kiểm tra browser support
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                throw new Error('Push notifications not supported');
            }

            // Lấy service worker registration
            this.registration = await navigator.serviceWorker.ready;

            // Lấy VAPID public key từ server
            await this.getVapidPublicKey();

            // Kiểm tra subscription hiện tại
            this.subscription = await this.registration.pushManager.getSubscription();

            return true;
        } catch (error) {
            console.error('Failed to initialize push notifications:', error);
            return false;
        }
    }

    // Lấy VAPID public key từ server
    async getVapidPublicKey(): Promise<string> {
        try {
            const token = localStorage.getItem('token');
            const apiBase = (process.env.NEXT_PUBLIC_API_URL as string) || 'https://worktime-dux3.onrender.com';
            const response = await fetch(`${apiBase}/api/push/vapid-key`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`VAPID endpoint ${response.status}`);
            }

            const data = await response.json();
            if (data && data.success && data.publicKey) {
                this.vapidPublicKey = data.publicKey;
                return data.publicKey;
            }

            throw new Error('Invalid VAPID response');
        } catch (error) {
            console.error('Error getting VAPID key:', error);
            // Fallback: use build-time public key if provided, else a short demo key
            const envKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string) || 'BEl62iUYgUivxIkv69yViEuiBIa40HI...';
            this.vapidPublicKey = envKey;
            return this.vapidPublicKey;
        }
    }

    // Kiểm tra quyền notification
    async checkPermission(): Promise<NotificationPermission> {
        if (!('Notification' in window)) {
            return 'denied';
        }

        return Notification.permission;
    }

    // Yêu cầu quyền notification
    async requestPermission(): Promise<NotificationPermission> {
        if (!('Notification' in window)) {
            throw new Error('Notifications not supported');
        }

        const permission = await Notification.requestPermission();
        return permission;
    }

    // Đăng ký push notification
    async subscribe(): Promise<PushSubscription> {
        try {
            // Kiểm tra quyền
            const permission = await this.checkPermission();
            if (permission === 'denied') {
                throw new Error('Notification permission denied');
            }

            if (permission === 'default') {
                const newPermission = await this.requestPermission();
                if (newPermission === 'denied') {
                    throw new Error('User denied notification permission');
                }
            }

            // Kiểm tra xem đã subscribe chưa
            if (this.subscription) {
                console.log('Already subscribed to push notifications');
                return this.subscription;
            }

            // Tạo subscription mới
            const subscription = await this.registration!.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey!) as BufferSource
            });

            this.subscription = subscription;

            // Gửi subscription lên server
            await this.sendSubscriptionToServer(subscription);

            console.log('Successfully subscribed to push notifications');
            return subscription;
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            throw error;
        }
    }

    // Hủy đăng ký push notification
    async unsubscribe(): Promise<boolean> {
        try {
            if (!this.subscription) {
                console.log('No subscription to unsubscribe');
                return true;
            }

            // Hủy subscription
            const result = await this.subscription.unsubscribe();

            if (result) {
                // Gửi request hủy đăng ký lên server
                await this.removeSubscriptionFromServer(this.subscription);

                this.subscription = null;
                console.log('Successfully unsubscribed from push notifications');
                return true;
            } else {
                throw new Error('Failed to unsubscribe');
            }
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error);
            throw error;
        }
    }

    // Gửi subscription lên server
    async sendSubscriptionToServer(subscription: PushSubscription): Promise<{ success: boolean; message?: string }> {
        try {
            const token = localStorage.getItem('token');
            const apiBase = (process.env.NEXT_PUBLIC_API_URL as string) || 'https://worktime-dux3.onrender.com';
            const response = await fetch(`${apiBase}/api/push/subscribe`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subscription: subscription,
                    userAgent: navigator.userAgent
                })
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to save subscription');
            }

            console.log('Subscription saved to server');
            return data;
        } catch (error) {
            console.error('Error saving subscription:', error);
            // For demo purposes, don't throw error
            console.log('Demo mode: Subscription not saved to server');
            return { success: true };
        }
    }

    // Xóa subscription khỏi server
    async removeSubscriptionFromServer(subscription: PushSubscription): Promise<{ success: boolean; message?: string }> {
        try {
            const token = localStorage.getItem('token');
            const apiBase = (process.env.NEXT_PUBLIC_API_URL as string) || 'https://worktime-dux3.onrender.com';
            const response = await fetch(`${apiBase}/api/push/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    endpoint: subscription.endpoint
                })
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to remove subscription');
            }

            console.log('Subscription removed from server');
            return data;
        } catch (error) {
            console.error('Error removing subscription:', error);
            // For demo purposes, don't throw error
            console.log('Demo mode: Subscription not removed from server');
            return { success: true };
        }
    }

    // Test push notification
    async testPushNotification(): Promise<{ success: boolean; message?: string }> {
        try {
            const token = localStorage.getItem('token');
            const apiBase = (process.env.NEXT_PUBLIC_API_URL as string) || 'https://worktime-dux3.onrender.com';
            const response = await fetch(`${apiBase}/api/push/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Test Notification',
                    body: 'This is a test push notification'
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('Test push notification sent');
                return data;
            } else {
                throw new Error(data.message || 'Failed to send test notification');
            }
        } catch (error) {
            console.error('Error sending test notification:', error);
            // For demo purposes, show a local notification
            this.showLocalNotification('Test Notification', 'This is a test push notification');
            return { success: true };
        }
    }

    // Show local notification for demo
    showLocalNotification(title: string, body: string): void {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'worktime-test'
            });
        }
    }

    // Convert VAPID key
    urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Lấy trạng thái subscription
    getSubscriptionStatus(): {
        isSubscribed: boolean;
        permission: NotificationPermission;
        subscription: PushSubscription | null;
    } {
        return {
            isSubscribed: !!this.subscription,
            permission: Notification.permission,
            subscription: this.subscription
        };
    }

    // Register service worker
    async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully:', registration);
                return registration;
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                throw error;
            }
        } else {
            throw new Error('Service Worker not supported');
        }
    }
}

export default PushNotificationManager;
