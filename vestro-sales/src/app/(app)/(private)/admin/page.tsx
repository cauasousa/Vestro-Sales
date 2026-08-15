'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Percent, TrendingUp, Users, UserCircle } from 'lucide-react';
import SalesChart from '@/src/components/SalesChart';
import { api, metricsApi, type MetricsSummary } from '@/src/lib/api';
import type { SalesForecastPoint } from '@/src/lib/types';

export default function AdminDashboardPage() {
    const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
    const [history, setHistory] = useState<SalesForecastPoint[]>([]);
    const [forecast, setForecast] = useState<SalesForecastPoint[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        Promise.all([metricsApi.summary(), api.getSalesForecast()])
            .then(([summary, sales]) => {
                if (!active) return;
                setMetrics(summary);
                setHistory(sales.history);
                setForecast(sales.forecast);
            })
            .catch((err) => {
                if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
            });

        return () => {
            active = false;
        };
    }, []);

    const cards = [
        { label: 'Revenue (7 days)', value: metrics ? `$${metrics.revenue.toFixed(2)}` : '—', icon: DollarSign },
        { label: 'New customers', value: metrics ? metrics.newCustomers : '—', icon: Users },
        { label: 'Conversion rate', value: metrics ? `${metrics.conversionRate}%` : '—', icon: Percent },
        { label: 'Orders (7 days)', value: metrics ? metrics.ordersCount : '—', icon: TrendingUp },
        { label: 'Total users', value: metrics ? metrics.totalUsers : '—', icon: UserCircle },
    ];

    return (
        <div className="max-w-6xl">
            <h1 className="font-display text-2xl font-semibold">General metrics</h1>
            <p className="mt-1 text-sm text-ink/60">Last 7 days.</p>

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
                {cards.map((c) => (
                    <div key={c.label} className="rounded-2xl border border-black/5 bg-white p-5">
                        <c.icon size={18} className="text-muted" />
                        <p className="mt-3 text-2xl font-semibold">{c.value}</p>
                        <p className="mt-1 text-xs text-ink/50">{c.label}</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 rounded-2xl border border-black/5 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="font-display text-lg font-semibold">Sales forecast</h2>
                        <p className="text-xs text-ink/50">
                            Solid line = actual sales · Dashed line = predicted next 7 days
                        </p>
                    </div>
                </div>

                <SalesChart history={history} forecast={forecast} />
            </div>
        </div>
    );
}
