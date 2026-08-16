'use client';

import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import type { SalesForecastPoint } from '@/src/lib/types';

export default function ForecastChart({
    forecast,
    mlForecast = [],
}: {
    forecast: SalesForecastPoint[];
    mlForecast?: SalesForecastPoint[];
}) {
    const mlByDate = new Map(mlForecast.map((point) => [point.date, point.predicted]));
    const data = forecast.map((point) => ({
        ...point,
        predictedMl: mlByDate.get(point.date) ?? null,
    }));

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #00000010', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#3D5AFE"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                        name="Trend forecast"
                    />
                    {mlForecast.length > 0 && (
                        <Line
                            type="monotone"
                            dataKey="predictedMl"
                            stroke="#8B5CF6"
                            strokeWidth={2}
                            strokeDasharray="2 3"
                            dot={false}
                            connectNulls
                            name="ML forecast"
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
