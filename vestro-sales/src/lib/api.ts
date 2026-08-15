import { getAccessToken, setSession, type Session } from '@/src/lib/session';
import type { Profile, SalesForecastPoint } from '@/src/lib/types';
import type { Order, OrderCreateInput, Product, ProductCreateInput, Role } from '@/src/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const accessToken = getAccessToken();

    let res: Response;
    try {
        res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                ...options.headers,
            },
        });
    } catch {
        // Network failure, backend unreachable, CORS block, etc — `fetch` itself
        // throws a raw, unfriendly TypeError here rather than resolving with a
        // bad status. Normalize it so callers only ever see one error shape.
        throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
    }

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(res.status, body?.detail || `API error ${res.status}`);
    }

    if (res.status === 204) return undefined as T;

    try {
        return (await res.json()) as T;
    } catch {
        throw new ApiError(res.status, 'The server sent back an unexpected response.');
    }
}

// ---- auth ----

export type AuthResponse = { user: Profile; session: Session | null };

export const authApi = {
    register: (input: { full_name: string; email: string; password: string }) =>
        request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) }),

    login: (email: string, password: string) =>
        request<AuthResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    logout: () => request<void>('/api/auth/logout', { method: 'POST' }).finally(() => setSession(null)),

    me: () => request<Profile>('/api/auth/me'),
};

// ---- products ----

export const productsApi = {
    list: (params?: { category?: string; search?: string; featured?: boolean; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.category) query.set('category', params.category);
        if (params?.search) query.set('search', params.search);
        if (params?.featured) query.set('featured', 'true');
        if (params?.limit) query.set('limit', String(params.limit));
        const qs = query.toString();
        return request<Product[]>(`/api/products${qs ? `?${qs}` : ''}`);
    },

    categories: () => request<string[]>('/api/products/categories'),

    get: (id: string) => request<Product>(`/api/products/${id}`),

    create: (input: ProductCreateInput) =>
        request<Product>('/api/products', { method: 'POST', body: JSON.stringify(input) }),

    update: (id: string, input: Partial<ProductCreateInput>) =>
        request<Product>(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

    remove: (id: string) => request<void>(`/api/products/${id}`, { method: 'DELETE' }),
};

// ---- orders ----

export const ordersApi = {
    // Admins get every order; customers get their own (backend decides by role).
    list: () => request<Order[]>('/api/orders'),

    get: (id: string) => request<Order>(`/api/orders/${id}`),

    place: (input: OrderCreateInput) =>
        request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(input) }),
};

// ---- users ----

export const usersApi = {
    list: () => request<Profile[]>('/api/users'),

    create: (input: { full_name: string; email: string; password: string; role: Role }) =>
        request<Profile>('/api/users', { method: 'POST', body: JSON.stringify(input) }),
};

// ---- metrics ----

export type MetricsSummary = {
    revenue: number;
    newCustomers: number;
    conversionRate: number;
    ordersCount: number;
    totalUsers: number;
};

export const metricsApi = {
    summary: () => request<MetricsSummary>('/api/metrics/summary'),
};

// ---- chat ----

export type ChatMessage = { id: string; from: 'admin' | 'customer'; text: string; createdAt: string };
export type Conversation = { customerId: string; customerName: string; messages: ChatMessage[] };

export const chatApi = {
    conversations: () => request<Conversation[]>('/api/chat/conversations'),

    conversation: (customerId: string) => request<Conversation>(`/api/chat/conversations/${customerId}`),

    sendMessage: (customerId: string, text: string, from: ChatMessage['from']) =>
        request<Conversation>(`/api/chat/conversations/${customerId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ text, from }),
        }),
};

// ---- sales / AI assistant ----

export const api = {
    getSalesForecast: () =>
        request<{ history: SalesForecastPoint[]; forecast: SalesForecastPoint[] }>('/api/sales/forecast'),

    askAssistant: (prompt: string) =>
        request<{ answer: string }>('/api/ai/assistant', {
            method: 'POST',
            body: JSON.stringify({ prompt }),
        }),

    summarizeFeedback: () => request<{ summary: string }>('/api/ai/summarize-feedback', { method: 'POST' }),
};
