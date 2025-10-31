// Service Worker for Push Notifications
const CACHE_NAME = 'worktime-app-v5'; // Tăng version để clear cache cũ và tránh xung đột
const urlsToCache = [
    // Không cache '/' để tránh giữ HTML cũ sau mỗi lần deploy
    '/manifest.webmanifest'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                // Add each URL individually with error handling
                return Promise.allSettled(
                    urlsToCache.map(url =>
                        cache.add(url).catch(error => {
                            console.warn(`Failed to cache ${url}:`, error);
                            return null; // Continue with other URLs
                        })
                    )
                );
            })
            .catch(error => {
                console.error('Cache installation failed:', error);
                // Continue installation even if caching fails
            })
    );
    // Activate this SW immediately
    self.skipWaiting();
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
        }).then(() => self.clients.claim())
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    const reqUrl = new URL(event.request.url);
    // Ignore cross-origin requests (e.g., Supabase) to avoid interfering with CORS/network
    if (reqUrl.origin !== self.location.origin) {
        return; // Let the browser handle it directly
    }
    // Never cache Next.js build assets, chunks, or HMR/runtime files
    if (reqUrl.pathname.startsWith('/_next/') ||
        reqUrl.pathname.includes('/chunks/') ||
        reqUrl.pathname.includes('.hot-update.')) {
        return; // Let the network handle it directly - luôn lấy bản mới nhất
    }
    // Never cache API requests to always get fresh data
    if (reqUrl.pathname.startsWith('/api/')) {
        return; // Let the network handle it directly - luôn lấy dữ liệu API mới nhất
    }

    // Với tài liệu HTML (document), sử dụng chiến lược network-first để luôn nhận HTML mới nhất
    const isDocumentRequest = event.request.destination === 'document' ||
        (event.request.headers.get('accept') || '').includes('text/html');

    if (isDocumentRequest) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Cache bản HTML cho offline fallback
                    try {
                        const isBasic = networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic';
                        if (isBasic) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache)).catch(() => { });
                        }
                    } catch { }
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback: nếu offline, trả từ cache nếu có
                    return caches.match(event.request);
                })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version if available
                if (response) {
                    return response;
                }

                // Otherwise fetch from network
                return fetch(event.request).then((networkResponse) => {
                    // Optionally cache non-Next, same-origin, basic responses
                    try {
                        const isSameOrigin = reqUrl.origin === self.location.origin;
                        const isBasic = networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic';
                        if (isSameOrigin && isBasic && !reqUrl.pathname.startsWith('/_next/')) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache)).catch(() => { });
                        }
                    } catch { }
                    return networkResponse;
                }).catch(error => {
                    console.warn('Fetch failed:', error);
                    // Return a basic offline page or fallback
                    if (event.request.destination === 'document') {
                        return new Response(
                            '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
                            { headers: { 'Content-Type': 'text/html' } }
                        );
                    }
                    throw error;
                });
            })
            .catch(error => {
                console.error('Cache and fetch failed:', error);
                // Return a basic error response
                return new Response('Network error', { status: 408 });
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

    // Always go to homepage on click
    const urlToOpen = '/';

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

        // Note: localStorage is not available in Service Worker context
        // This is just a placeholder for background sync logic
        console.log('Background sync completed');

        // Update badge if supported
        if (navigator.setAppBadge) {
            try {
                await navigator.setAppBadge(0); // Clear badge
            } catch (error) {
                console.warn('Failed to update app badge:', error);
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
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled rejection:', event.reason);
    // Prevent the default behavior to avoid console errors
    event.preventDefault();
});

console.log('Service Worker loaded successfully');
