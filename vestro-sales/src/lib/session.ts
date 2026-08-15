export type Session = {
    access_token: string;
    refresh_token: string;
    expires_at: number | null;
};

const SESSION_KEY = 'vestro_session';

export function getSession(): Session | null {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    try {
        return JSON.parse(stored) as Session;
    } catch {
        return null;
    }
}

export function setSession(session: Session | null) {
    if (typeof window === 'undefined') return;

    if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
        localStorage.removeItem(SESSION_KEY);
    }
}

export function getAccessToken(): string | null {
    return getSession()?.access_token ?? null;
}
