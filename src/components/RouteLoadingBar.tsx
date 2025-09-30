'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function RouteLoadingBar() {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);
    const [contentHidden, setContentHidden] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    useLayoutEffect(() => {
        // Immediately hide content and show loading bar - runs synchronously before paint
        setContentHidden(true);
        setVisible(true);

        // Simulate progress duration; hide after short delay to avoid flicker
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
            setVisible(false);
            setContentHidden(false);
        }, 600);

        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        };
    }, [pathname]);

    // Add CSS to hide content when loading
    useLayoutEffect(() => {
        if (contentHidden) {
            // Immediately hide content without transition - runs before paint
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.style.opacity = '0';
                mainContent.style.transition = 'none';
            }
            document.body.style.overflow = 'hidden';
        } else {
            // Show content with transition
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.style.transition = 'opacity 0.3s ease-in-out';
                // Use requestAnimationFrame to ensure the transition works
                requestAnimationFrame(() => {
                    if (mainContent) {
                        mainContent.style.opacity = '1';
                    }
                });
            }
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.style.opacity = '1';
                mainContent.style.transition = '';
            }
        };
    }, [contentHidden]);

    if (!visible) return null;

    return (
        <div className="fixed top-16 left-0 right-0 z-[1000]">
            <div className="h-1 bg-blue-600 animate-[loader_0.6s_ease_forwards] rounded-b" />
            <style>{`
                @keyframes loader {
                    0% { width: 0%; }
                    80% { width: 85%; }
                    100% { width: 100%; }
                }
            `}</style>
        </div>
    );
}


