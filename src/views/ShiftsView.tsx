'use client';

import ShiftTable from '@/components/ShiftTable';
import { useEffect, useState } from 'react';

export default function ShiftsView() {
    const [userId, setUserId] = useState<string>('');
    const [userRole, setUserRole] = useState<string>('');
    const [userName, setUserName] = useState<string>('');

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
                    if (data?.success && data?.user) {
                        setUserId(data.user.id || '');
                        setUserRole(data.user.role || '');
                        setUserName(data.user.name || '');
                    }
                }
            } catch {
                // ignore
            }
        };
        loadProfile();
    }, []);

    return (
        <ShiftTable userId={userId} userName={userName} isAdmin={userRole === 'admin'} />
    );
}


