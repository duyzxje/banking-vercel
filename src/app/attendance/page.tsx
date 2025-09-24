"use client";
import AppShellLegacy from '@/components/AppShellLegacy';
import AttendanceView from '@/views/AttendanceView';
import StaffAttendanceView from '@/views/StaffAttendanceView';
import { useEffect, useState } from 'react';

export default function AttendancePage() {
    const [role, setRole] = useState<string>('');
    useEffect(() => {
        const load = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (!token) return;
                const res = await fetch('https://worktime-dux3.onrender.com/api/auth/verify', { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setRole(data?.user?.role || '');
                }
            } catch { }
        };
        load();
    }, []);

    return (
        <AppShellLegacy>
            {role === 'admin' ? <AttendanceView /> : <StaffAttendanceView />}
        </AppShellLegacy>
    );
}


