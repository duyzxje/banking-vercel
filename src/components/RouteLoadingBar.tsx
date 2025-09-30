'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function RouteLoadingBar() {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        // Show the bar when pathname changes
        setVisible(true);
        // Simulate progress duration; hide after short delay to avoid flicker
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setVisible(false), 600);
        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        };
    }, [pathname]);

    if (!visible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[1000]">
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


