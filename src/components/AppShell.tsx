'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const [isAuthed, setIsAuthed] = useState<boolean>(false);

    useEffect(() => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            setIsAuthed(!!token);
        } catch {
            setIsAuthed(false);
        }
    }, [pathname]);

    if (!isAuthed) {
        return <>{children}</>;
    }

    const linkClass = (href: string) =>
        `flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50 ${pathname === href ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`;

    return (
        <div className="min-h-screen flex">
            <aside className="w-56 shrink-0 border-r bg-white p-3">
                <div className="font-semibold mb-3">Giorlin App</div>
                <nav className="space-y-1 text-sm">
                    <Link className={linkClass('/')} href="/">Trang chủ</Link>
                    <Link className={linkClass('/orders')} href="/orders">Quản lí đơn hàng</Link>
                </nav>
                <div className="mt-4 text-xs text-gray-500">Version 1.0</div>
            </aside>
            <main className="flex-1 bg-gray-50">
                {children}
            </main>
        </div>
    );
}


