'use client';

import { useEffect } from 'react';
import usePushNotifications from './usePushNotifications';

// Detect if app is running as an installed PWA
function isStandalonePWA(): boolean {
    // iOS Safari
    const isIOSStandalone = typeof navigator !== 'undefined' && Boolean((navigator as unknown as { standalone?: boolean }).standalone);
    // All modern browsers
    const isDisplayModeStandalone = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    return Boolean(isIOSStandalone || isDisplayModeStandalone);
}

const AutoPushInitializer: React.FC = () => {
    const { pushManager, isInitialized, isSubscribed, permission, subscribe, requestPermission } = usePushNotifications();

    useEffect(() => {
        const run = async () => {
            try {
                // Always try to register SW early (safe if already registered)
                await pushManager.registerServiceWorker();

                // If app is installed to home screen, proactively check/request
                if (isStandalonePWA()) {
                    // If permission not decided, request it
                    if (permission === 'default') {
                        const granted = await requestPermission();
                        if (granted !== 'granted') return;
                    }

                    // If granted but not yet subscribed, subscribe (when token exists)
                    if (typeof window !== 'undefined') {
                        const token = localStorage.getItem('token');
                        if (token && (permission === 'granted') && !isSubscribed) {
                            await subscribe();
                        }
                    }
                } else {
                    // If not in standalone but user has already granted, ensure subscription exists when token is present
                    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                    if (token && isInitialized && permission === 'granted' && !isSubscribed) {
                        await subscribe();
                    }
                }
            } catch (err) {
                // Non-fatal; best-effort auto init
                console.warn('AutoPushInitializer warning:', err);
            }
        };

        run();
        // Only run on mount and when core states change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitialized, isSubscribed, permission]);

    return null;
};

export default AutoPushInitializer;


