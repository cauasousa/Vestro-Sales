'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Percent, TrendingUp, Users, UserCircle } from 'lucide-react';
import SalesChart from '@/src/components/SalesChart';
import { mockMetrics, mockSalesData } from '@/src/lib/mock-admin';
import { getUsers } from '@/src/lib/user-store';
import type { SalesForecastPoint } from '@/src/lib/types';

type Metrics = {
    revenue: number;
    newCustomers: number;
    conversionRate: number;
    ordersCount: number;
};

export default function AdminDashboardPage() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [history, setHistory] = useState<SalesForecastPoint[]>([]);
    const [forecast, setForecast] = useState<SalesForecastPoint[]>([]);
    const [totalUsers, setTotalUsers] = useState<number | null>(null);

    useEffect(() => {
        // Mock data load
        setMetrics(mockMetrics);
        setTotalUsers(getUsers().length);

        const historical = mockSalesData.filter((d) => d.actual !== null);
        const forecasted = mockSalesData.filter((d) => d.predicted !== null);

        setHistory(historical as SalesForecastPoint[]);
        setForecast(forecasted as SalesForecastPoint[]);
    }, []);

    const cards = [
        { label: 'Revenue (7 days)', value: metrics ? `$${metrics.revenue.toFixed(2)}` : '—', icon: DollarSign },
        { label: 'New customers', value: metrics ? metrics.newCustomers : '—', icon: Users },
        { label: 'Conversion rate', value: metrics ? `${metrics.conversionRate}%` : '—', icon: Percent },
        { label: 'Orders (7 days)', value: metrics ? metrics.ordersCount : '—', icon: TrendingUp },
        { label: 'Total users', value: totalUsers ?? '—', icon: UserCircle },
    ];

    return (
        <div className="max-w-6xl">
            <h1 className="font-display text-2xl font-semibold">General metrics</h1>
            <p className="mt-1 text-sm text-ink/60">Last 7 days, mock data for MVP.</p>

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
