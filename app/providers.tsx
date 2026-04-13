'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setToken, setUser, setIsHydrated, isHydrated } = useAuthStore();

    useEffect(() => {
        const initAuth = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    setToken(token);
                    try {
                        const userData = await apiClient.getCurrentUser();
                        setUser(userData.user);
                    } catch (err) {
                        console.error('Failed to sync auth user', err);
                    }
                }
            } finally {
                setIsHydrated(true);
            }
        };

        if (!isHydrated) {
            initAuth();
        }
    }, [setToken, setUser, setIsHydrated, isHydrated]);

    return <>{children}</>;
}
