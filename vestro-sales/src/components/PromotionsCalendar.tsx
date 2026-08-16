'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { CalendarContextEntry } from '@/src/lib/types';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getMonthCells(monthStart: Date): (Date | null)[] {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

    const cells: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

export default function PromotionsCalendar({
    month,
    onPrevMonth,
    onNextMonth,
    entries,
    eventCounts,
    onSelectDay,
    onAddClick,
    selectedDate,
}: {
    month: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    entries: Record<string, CalendarContextEntry>;
    eventCounts?: Record<string, number>;
    onSelectDay: (iso: string) => void;
    onAddClick: () => void;
    selectedDate?: string | null;
}) {
    const cells = getMonthCells(month);
    const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const today = toIsoDate(new Date());

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={onPrevMonth}
                        aria-label="Previous month"
                        className="rounded-lg p-1.5 text-ink/50 hover:bg-black/5 hover:text-ink"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="min-w-[130px] text-center font-display text-sm font-semibold">
                        {monthLabel}
                    </span>
                    <button
                        type="button"
                        onClick={onNextMonth}
                        aria-label="Next month"
                        className="rounded-lg p-1.5 text-ink/50 hover:bg-black/5 hover:text-ink"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={onAddClick}
                    className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-medium text-paper hover:bg-ink/85"
                >
                    <Plus size={14} />
                    Add campaign
                </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-ink/40">
                {WEEKDAY_LABELS.map((label) => (
                    <div key={label}>{label}</div>
                ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
                {cells.map((date, i) => {
                    if (!date) return <div key={`blank-${i}`} />;

                    const iso = toIsoDate(date);
                    const entry = entries[iso];
                    const eventCount = eventCounts?.[iso] ?? 0;
                    const isPast = iso < today;
                    const isToday = iso === today;
                    const isSelected = iso === selectedDate;

                    return (
                        <button
                            key={iso}
                            type="button"
                            disabled={isPast}
                            onClick={() => onSelectDay(iso)}
                            className={`flex h-16 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors ${
                                isSelected
                                    ? 'border-ink bg-ink/5'
                                    : isToday
                                      ? 'border-accent/50'
                                      : 'border-transparent hover:border-black/10'
                            } ${isPast ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}
                        >
                            <span className={`text-xs font-medium ${isToday ? 'text-accent' : 'text-ink/70'}`}>
                                {date.getDate()}
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                                {entry && entry.discount_rate > 0 && (
                                    <span className="rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-semibold leading-none text-emerald-700">
                                        {Math.round(entry.discount_rate * 100)}%
                                    </span>
                                )}
                                {entry?.has_event && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                                {eventCount > 0 && (
                                    <span className="rounded bg-violet-50 px-1 py-0.5 text-[9px] font-semibold leading-none text-violet-700">
                                        {eventCount} {eventCount === 1 ? 'event' : 'events'}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
