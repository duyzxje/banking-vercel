// Service Worker for Push Notifications
const CACHE_NAME = 'worktime-app-v1';
const urlsToCache = [
    '/',
    '/static/js/bundle.js',
    '/static/css/main.css',
    '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
    console.log('Push event received:', event);

    let notificationData = {
        title: 'Thông báo mới',
        body: 'Bạn có thông báo mới từ hệ thống',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'worktime-notification',
        requireInteraction: false,
        actions: [
            {
                action: 'view',
                title: 'Xem',
                icon: '/icon-192.png'
            },
            {
                action: 'dismiss',
                title: 'Đóng',
                icon: '/icon-192.png'
            }
        ],
        data: {
            url: '/',
            timestamp: Date.now()
        }
    };

    // Parse push data if available
    if (event.data) {
        try {
            const pushData = event.data.json();
            console.log('Push data:', pushData);

            if (pushData.title) notificationData.title = pushData.title;
            if (pushData.body) notificationData.body = pushData.body;
            if (pushData.icon) notificationData.icon = pushData.icon;
            if (pushData.badge) notificationData.badge = pushData.badge;
            if (pushData.tag) notificationData.tag = pushData.tag;
            if (pushData.requireInteraction !== undefined) {
                notificationData.requireInteraction = pushData.requireInteraction;
            }
            if (pushData.actions) notificationData.actions = pushData.actions;
            if (pushData.data) notificationData.data = { ...notificationData.data, ...pushData.data };
        } catch (error) {
            console.error('Error parsing push data:', error);
        }
    }

    const promiseChain = self.registration.showNotification(
        notificationData.title,
        notificationData
    );

    event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('Notification click received:', event);

    event.notification.close();

    if (event.action === 'dismiss') {
        // Just close the notification
        return;
    }

    // Default action or 'view' action
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // Check if there's already a window/tab open with the target URL
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }

            // If no existing window, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event);

    // Track notification dismissal if needed
    if (event.notification.data?.trackDismissal) {
        // Send analytics or tracking data
        console.log('Notification dismissed by user');
    }
});

// Background sync event
self.addEventListener('sync', (event) => {
    console.log('Background sync event:', event);

    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Perform background sync operations
            doBackgroundSync()
        );
    }
});

// Background sync function
async function doBackgroundSync() {
    try {
        console.log('Performing background sync...');

        // Check for new notifications
        const response = await fetch('/api/notifications/user/count', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.count > 0) {
                // Update badge
                if (navigator.setAppBadge) {
                    navigator.setAppBadge(data.count);
                }
            }
        }
    } catch (error) {
        console.error('Background sync error:', error);
    }
}

// Message event - Handle messages from main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Error handling
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled rejection:', event);
});

console.log('Service Worker loaded successfully');
