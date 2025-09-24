'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CalendarClock, CreditCard, Home, Menu, Settings, LogOut } from 'lucide-react';
import NotificationPopup from './NotificationPopup';

interface AppShellLegacyProps {
    children: React.ReactNode;
}

export default function AppShellLegacy({ children }: AppShellLegacyProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [userRole, setUserRole] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const [notificationOpen, setNotificationOpen] = useState<boolean>(false);

    const handleLogout = () => {
        const cleanupAndReload = () => {
            // Best-effort: unregister all service workers and clear caches to avoid stale chunks
            try {
                if (typeof window !== 'undefined') {
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(regs => {
                            regs.forEach(reg => reg.unregister());
                        });
                    }
                    if ('caches' in window) {
                        caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
                    }
                }
            } catch { }

            // Full reload to reset app state
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            } else {
                router.push('/');
            }
        };

        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                sessionStorage.clear();
                cleanupAndReload();
                return;
            }
        } catch { }
        cleanupAndReload();
    };

    useEffect(() => {
        // fetch role to decide visibility of Admin
        const loadProfile = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (!token) return;
                const res = await fetch('https://worktime-dux3.onrender.com/api/auth/verify', {
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: 'no-store'
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.success && data?.user) {
                        setUserRole(data.user.role || '');
                        setUserName(data.user.name || '');
                    }
                }
            } catch {
                // ignore
            }
        };
        loadProfile();
    }, [pathname]);

    const item = (href: string, label: string, icon: React.ReactNode, active: boolean, onClick: () => void) => (
        <li>
            <button
                onClick={() => { onClick(); setSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
                {icon}
                <span>{label}</span>
            </button>
        </li>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:z-10`}>
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="text-xl font-bold text-gray-900">Giorlin</div>
                    </div>
                </div>
                <nav className="p-4 space-y-2">
                    <ul className="space-y-2">
                        {item('/', 'Trang chủ', <Home className="h-5 w-5" />, pathname === '/', () => router.push('/'))}
                        {item('/transactions', 'Giao dịch', <CreditCard className="h-5 w-5" />, pathname === '/transactions', () => router.push('/transactions'))}
                        {item('/orders', 'Đơn hàng', <CreditCard className="h-5 w-5" />, pathname === '/orders', () => router.push('/orders'))}
                        {item('/attendance', 'Chấm công', <Home className="h-5 w-5" />, pathname === '/attendance', () => router.push('/attendance'))}
                        {item('/shifts', 'Đăng ký ca', <CalendarClock className="h-5 w-5" />, pathname === '/shifts', () => router.push('/shifts'))}
                        {userRole === 'admin' && item('/admin', 'Quản lý', <Settings className="h-5 w-5" />, pathname === '/admin', () => router.push('/admin'))}
                        <li>
                            <button
                                onClick={() => { handleLogout(); setSidebarOpen(false); }}
                                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100`}
                            >
                                <LogOut className="h-5 w-5" />
                                <span>Đăng xuất</span>
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>

            {/* Main */}
            <div className="md:pl-64">
                <header className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center">
                                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-2 p-2 rounded-lg hover:bg-gray-100 md:hidden">
                                    <span className="sr-only">Toggle sidebar</span>
                                    <Menu className="h-5 w-5 text-gray-700" />
                                </button>
                                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Giorlin</h1>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setNotificationOpen(true)} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Mở thông báo">
                                    <Bell className="h-5 w-5 text-gray-700" />
                                </button>
                                {userName && (
                                    <div className="flex flex-col sm:flex-row sm:items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                                        <span className="text-xs sm:text-sm font-medium text-center sm:text-left">
                                            Hi, {userName}
                                        </span>
                                        {userRole === 'admin' && (
                                            <span className="text-xs text-red-600 text-center sm:ml-1 sm:text-left">
                                                (Admin)
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 transition-all duration-300">
                    {children}
                </main>
            </div>
            <NotificationPopup isOpen={notificationOpen} onClose={() => setNotificationOpen(false)} isAdmin={userRole === 'admin'} />
        </div>
    );
}


