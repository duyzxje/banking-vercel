'use client';

import AppShellLegacy from '@/components/AppShellLegacy';
import AdminView from '@/views/AdminView';
import { useEffect, useState } from 'react';

export default function AdminPage() {
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

    // Chỉ hiển thị cho admin
    if (userRole !== 'admin') {
        return (
            <AppShellLegacy>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Không có quyền truy cập</h2>
                        <p className="text-gray-600">Trang này chỉ dành cho quản trị viên.</p>
                    </div>
                </div>
            </AppShellLegacy>
        );
    }

    return (
        <AppShellLegacy>
            <AdminView />
        </AppShellLegacy>
    );
}


