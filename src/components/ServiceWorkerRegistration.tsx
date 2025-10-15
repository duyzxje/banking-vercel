'use client';

import { useEffect, useRef } from 'react';

async function fetchAppVersion(): Promise<string | null> {
    try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.version || null;
    } catch {
        return null;
    }
}

const ServiceWorkerRegistration: React.FC = () => {
    const lastVersionRef = useRef<string | null>(null);

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

        let removed = false;

        const setupRegistration = async () => {
            if (!('serviceWorker' in navigator)) return;

            // Register SW
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered successfully:', registration);

            // Reload when controller changes (new SW takes control)
            let hasReloaded = false;
            const onControllerChange = () => {
                if (hasReloaded) return;
                hasReloaded = true;
                // Bust caches by adding version param if available
                const currentUrl = new URL(window.location.href);
                if (lastVersionRef.current) {
                    currentUrl.searchParams.set('v', lastVersionRef.current);
                } else {
                    currentUrl.searchParams.set('t', String(Date.now()));
                }
                window.location.replace(currentUrl.toString());
            };
            navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

            // Listen for updatefound -> installed
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // A new SW is installed and waiting to activate
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });

            // Poll version and trigger update when changed
            const checkVersionAndUpdate = async () => {
                const version = await fetchAppVersion();
                if (!version) return;
                if (lastVersionRef.current && lastVersionRef.current !== version) {
                    // Try to update SW and then force activation
                    try { await registration.update(); } catch { }
                    if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                }
                lastVersionRef.current = version;
            };

            // Initial check and periodic recheck while page is open
            await checkVersionAndUpdate();
            const interval = window.setInterval(checkVersionAndUpdate, 60_000);

            return () => {
                window.clearInterval(interval);
                navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            };
        };

        setupRegistration();

        return () => { removed = true; };
    }, []);

    return null; // This component doesn't render anything
};

export default ServiceWorkerRegistration;
