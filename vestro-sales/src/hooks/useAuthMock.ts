import { useEffect, useState } from 'react';
import { findUserByEmail } from '@/src/lib/user-store';
import type { User } from '@/src/types';

type AuthState = {
    user: User | null;
    isLoading: boolean;
    isManager: boolean;
};

const STORAGE_KEY = 'vestro_auth_user';

export function useAuthMock() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isManager: false,
    });

    // Check for stored auth on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const user = JSON.parse(stored);
                setAuthState({
                    user,
                    isLoading: false,
                    isManager: user.role === 'manager',
                });
            } catch {
                setAuthState({ user: null, isLoading: false, isManager: false });
            }
        } else {
            setAuthState({ user: null, isLoading: false, isManager: false });
        }
    }, []);

    const login = (email: string, password: string) => {
        const user = findUserByEmail(email);
        if (!user || user.password !== password) {
            throw new Error('Invalid email or password');
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        setAuthState({
            user,
            isLoading: false,
            isManager: user.role === 'manager',
        });
        return user;
    };

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY);
        setAuthState({ user: null, isLoading: false, isManager: false });
    };

    return {
        ...authState,
        login,
        logout,
    };
}
