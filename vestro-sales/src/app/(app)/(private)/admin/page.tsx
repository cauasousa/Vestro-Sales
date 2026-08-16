'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Percent, Sparkles, TrendingUp, Users, UserCircle } from 'lucide-react';
import CurrentSalesChart from '@/src/components/CurrentSalesChart';
import ForecastChart from '@/src/components/ForecastChart';
import { api, metricsApi, type MetricsSummary } from '@/src/lib/api';
import type { SalesForecastPoint } from '@/src/lib/types';

export default function AdminDashboardPage() {
    const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
    const [history, setHistory] = useState<SalesForecastPoint[]>([]);
    const [forecast, setForecast] = useState<SalesForecastPoint[]>([]);
    const [mlForecast, setMlForecast] = useState<SalesForecastPoint[]>([]);
    const [mlAvailable, setMlAvailable] = useState(false);
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

        // Fetched separately: the ML forecast is still rolling out, and shouldn't
        // take down the rest of the dashboard if it fails.
        api.getMlForecast()
            .then(({ forecast: points, model_available }) => {
                if (!active) return;
                setMlForecast(points);
                setMlAvailable(model_available);
            })
            .catch(() => {});

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
        <div className="mx-auto max-w-6xl">
            <h1 className="font-display text-2xl font-semibold">Metrics</h1>
            <p className="mt-1 text-sm text-ink/60">Overview of recent performance and business projections.</p>

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

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-black/5 bg-white p-6">
                    <div className="mb-4">
                        <h2 className="font-display text-lg font-semibold">Current sales</h2>
                        <p className="text-xs text-ink/50">Actual revenue, last 7 days.</p>
                    </div>

                    <CurrentSalesChart history={history} />
                </div>

                <div className="rounded-2xl border border-black/5 bg-white p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-display text-lg font-semibold">Trend &amp; ML forecast</h2>
                            <p className="text-xs text-ink/50">Next 7 days, blue = trend · purple = ML</p>
                        </div>

                        <div
                            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium ${
                                mlAvailable ? 'bg-violet-50 text-violet-600' : 'bg-black/5 text-ink/50'
                            }`}
                        >
                            <Sparkles size={13} />
                            {mlAvailable ? 'ML model active' : 'ML model not trained yet'}
                        </div>
                    </div>

                    <ForecastChart forecast={forecast} mlForecast={mlForecast} />
                </div>
            </div>
        </div>
    );
}
