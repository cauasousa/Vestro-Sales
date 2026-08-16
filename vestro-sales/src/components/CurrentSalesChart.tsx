'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { SalesForecastPoint } from '@/src/lib/types';

export default function CurrentSalesChart({ history }: { history: SalesForecastPoint[] }) {
    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #00000010', fontSize: 12 }} />
                    <Bar dataKey="actual" fill="#0B0D10" radius={[6, 6, 0, 0]} name="Actual sales" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
