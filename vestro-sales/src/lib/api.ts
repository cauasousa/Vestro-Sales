const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(path: string, options: RequestInit = {}, accessToken?: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...options.headers,
        },
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
}

import type { SalesForecastPoint } from './types';

export const api = {
    getSalesForecast: (accessToken?: string) =>
        request<{ history: SalesForecastPoint[]; forecast: SalesForecastPoint[] }>(
            '/api/sales/forecast',
            { method: 'GET' },
            accessToken
        ),

    askAssistant: (prompt: string, accessToken?: string) =>
        request<{ answer: string }>(
            '/api/ai/assistant',
            { method: 'POST', body: JSON.stringify({ prompt }) },
            accessToken
        ),

    summarizeFeedback: (accessToken?: string) =>
        request<{ summary: string }>(
            '/api/ai/summarize-feedback',
            { method: 'POST' },
            accessToken
        ),
};
