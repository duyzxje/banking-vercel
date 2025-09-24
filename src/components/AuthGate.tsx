'use client';

import { useEffect, useState } from 'react';
import Login from '@/components/Login';

interface AuthGateProps {
    children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const check = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (!token) {
                    setIsAuthenticated(false);
                    setLoading(false);
                    return;
                }
                const res = await fetch('https://worktime-dux3.onrender.com/api/auth/verify', {
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: 'no-store'
                });
                if (res.ok) setIsAuthenticated(true);
                else {
                    localStorage.removeItem('token');
                    setIsAuthenticated(false);
                }
            } catch {
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };
        check();
    }, []);

    const handleLogin = () => setIsAuthenticated(true);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    return <>{children}</>;
}


