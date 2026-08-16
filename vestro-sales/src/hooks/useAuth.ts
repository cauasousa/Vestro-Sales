'use client';

import { useCallback, useEffect, useState } from 'react';
import { authApi, type AuthResponse } from '@/src/lib/api';
import { getSession, setSession } from '@/src/lib/session';
import type { Profile } from '@/src/lib/types';

type AuthState = {
    user: Profile | null;
    isLoading: boolean;
    isAdmin: boolean;
};

const loggedOut: AuthState = { user: null, isLoading: false, isAdmin: false };

export function useAuth() {
    const [state, setState] = useState<AuthState>({ user: null, isLoading: true, isAdmin: false });

    useEffect(() => {
        let active = true;

        const restore = async () => {
            if (!getSession()) {
                if (active) setState(loggedOut);
                return;
            }

            try {
                const user = await authApi.me();
                if (active) setState({ user, isLoading: false, isAdmin: user.role === 'admin' });
            } catch {
                setSession(null);
                if (active) setState(loggedOut);
            }
        };

        restore();
        return () => {
            active = false;
        };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const result = await authApi.login(email, password);
        setSession(result.session);
        setState({ user: result.user, isLoading: false, isAdmin: result.user.role === 'admin' });
        return result;
    }, []);

    const register = useCallback(
        async (fullName: string, email: string, password: string, acceptsMarketing = false) => {
            const result: AuthResponse = await authApi.register({
                full_name: fullName,
                email,
                password,
                accepts_marketing: acceptsMarketing,
            });
            if (result.session) {
                setSession(result.session);
                setState({ user: result.user, isLoading: false, isAdmin: result.user.role === 'admin' });
            }
            return result;
        },
        []
    );

    const logout = useCallback(async () => {
        // Best-effort: always clear the local session even if the API call
        // fails (network down, token already expired, etc) — the user should
        // never get stuck "logged in" just because the server call failed.
        try {
            await authApi.logout();
        } catch {
            setSession(null);
        } finally {
            setState(loggedOut);
        }
    }, []);

    return { ...state, login, register, logout };
}
