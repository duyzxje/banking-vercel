'use client';

import { useEffect } from 'react';

const ServiceWorkerRegistration: React.FC = () => {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            // Ensure no service worker is active during development to avoid HMR chunk issues
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(() => { });
            }
            // Also clear caches to avoid stale chunk URLs
            if (typeof caches !== 'undefined') {
                caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => { });
            }
            return;
        }
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered successfully:', registration);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New content is available, prompt user to refresh
                                    if (confirm('Có phiên bản mới của ứng dụng. Bạn có muốn tải lại trang?')) {
                                        window.location.reload();
                                    }
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });
        }

        // Listen for service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('Message from service worker:', event.data);
            });
        }

        // Handle beforeunload to clean up
        const handleBeforeUnload = () => {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'CLEANUP'
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    return null; // This component doesn't render anything
};

export default ServiceWorkerRegistration;
