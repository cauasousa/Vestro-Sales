'use client';

import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import type { SalesForecastPoint } from '@/src/lib/types';

export default function SalesChart({
    history,
    forecast,
}: {
    history: SalesForecastPoint[];
    forecast: SalesForecastPoint[];
}) {
    const data = [...history, ...forecast];

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #00000010', fontSize: 12 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#0B0D10"
                        strokeWidth={2}
                        dot={false}
                        name="Actual sales"
                    />
                    <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#3D5AFE"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                        name="Predicted (next 7 days)"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
