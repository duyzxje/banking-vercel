'use client';

import { Bell, CalendarClock, Clock, CreditCard, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HomeView() {
    const router = useRouter();
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
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
                    if (data?.success && data?.user?.role) {
                        setUserRole(data.user.role);
                    }
                }
            } catch {
                // ignore
            }
        };
        loadProfile();
    }, []);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Trang chủ</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                    <button
                        onClick={() => router.push('/transactions')}
                        className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300 hover:shadow-md"
                    >
                        <CreditCard className="h-8 w-8 mb-2 text-blue-600 mx-auto" />
                        <p className="text-sm font-medium">Giao dịch</p>
                    </button>
                    <button
                        onClick={() => router.push('/attendance')}
                        className="p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-all duration-200 border border-green-200 hover:border-green-300 hover:shadow-md"
                    >
                        <Clock className="h-8 w-8 mb-2 text-green-600 mx-auto" />
                        <p className="text-sm font-medium">Chấm công</p>
                    </button>
                    <button
                        onClick={() => router.push('/shifts')}
                        className="p-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all duration-200 border border-purple-200 hover:border-purple-300 hover:shadow-md"
                    >
                        <CalendarClock className="h-8 w-8 mb-2 text-purple-600 mx-auto" />
                        <p className="text-sm font-medium">Đăng ký ca</p>
                    </button>

                    {/* Nút Thông báo chỉ hiện cho staff */}
                    {userRole !== 'admin' && (
                        <button
                            onClick={() => router.push('/push')}
                            className="p-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-all duration-200 border border-amber-200 hover:border-amber-300 hover:shadow-md"
                        >
                            <Bell className="h-8 w-8 mb-2 text-amber-600 mx-auto" />
                            <p className="text-sm font-medium">Thông báo</p>
                        </button>
                    )}

                    {/* Nút Quản lý chỉ hiện cho admin */}
                    {userRole === 'admin' && (
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all duration-200 border border-red-200 hover:border-red-300 hover:shadow-md"
                        >
                            <Settings className="h-8 w-8 mb-2 text-red-600 mx-auto" />
                            <p className="text-sm font-medium">Quản lý</p>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


