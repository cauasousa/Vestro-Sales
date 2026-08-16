'use client';

import { useEffect, useState } from 'react';
import {
    CalendarClock,
    CalendarPlus,
    Layers,
    Mail,
    Megaphone,
    Package,
    Pencil,
    PartyPopper,
    Plus,
    Store,
    Tag,
    Trash2,
    X,
} from 'lucide-react';
import Modal from '@/src/components/Modal';
import PromotionsCalendar, { toIsoDate } from '@/src/components/PromotionsCalendar';
import { calendarContextApi, calendarEventsApi, discountsApi, marketingApi, productsApi } from '@/src/lib/api';
import type {
    CalendarContextEntry,
    CalendarEvent,
    Discount,
    DiscountScope,
    Product,
} from '@/src/lib/types';
import type { MarketingEmailResult } from '@/src/lib/api';

function formatShortDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysFromToday(value: string): number {
    const today = new Date(`${toIsoDate(new Date())}T00:00:00`);
    const target = new Date(`${value}T00:00:00`);
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function InfoBlock({
    accentClass,
    title,
    description,
    period,
}: {
    accentClass: string;
    title: string;
    description: string;
    period: string;
}) {
    return (
        <div className={`rounded-xl border border-l-4 border-black/5 bg-white p-4 ${accentClass}`}>
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink/60">{description}</p>
            <p className="mt-2 text-xs font-medium text-ink/40">{period}</p>
        </div>
    );
}

function discountStatus(discount: Discount): 'active' | 'upcoming' | 'expired' {
    const today = toIsoDate(new Date());
    const end = discount.endDate ?? discount.startDate;
    if (today < discount.startDate) return 'upcoming';
    if (today > end) return 'expired';
    return 'active';
}

function discountLabel(discount: Discount): string {
    if (discount.scope === 'all') return 'All products';
    if (discount.scope === 'category') return discount.category ?? 'Category';
    return discount.productName ?? 'Product';
}

function discountScopeIcon(scope: DiscountScope) {
    if (scope === 'product') return Package;
    if (scope === 'category') return Layers;
    return Store;
}

const discountStatusStyles: Record<'active' | 'upcoming' | 'expired', { dot: string; text: string }> = {
    active: { dot: 'bg-emerald-500', text: 'text-emerald-700' },
    upcoming: { dot: 'bg-blue-500', text: 'text-blue-700' },
    expired: { dot: 'bg-ink/30', text: 'text-ink/40' },
};

// Subtle by default, fully visible on row hover — applied via the parent's `group`.
const rowActionsClass = 'flex flex-shrink-0 items-center gap-1 opacity-40 transition-opacity group-hover:opacity-100';

const emptyForm = { date: '', discountPercent: '', hasEvent: false };

const emptyDiscountForm = {
    scope: 'all' as DiscountScope,
    category: '',
    productId: '',
    percentage: '',
    startDate: '',
    endDate: '',
};

const emptyEventForm = { date: '', name: '', description: '' };

const emptyEmailForm = { recipientMode: 'opted_in' as 'opted_in' | 'manual', manualEmails: '', subject: '', body: '' };

const emptyCampaignForm = { date: '', discountPercent: '', hasEvent: false };

export default function AdminPlanningPage() {
    const [calendarEntries, setCalendarEntries] = useState<CalendarContextEntry[]>([]);
    const [calendarLoading, setCalendarLoading] = useState(true);
    const [calendarError, setCalendarError] = useState<string | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
    const [monthEntries, setMonthEntries] = useState<Record<string, CalendarContextEntry>>({});
    const [form, setForm] = useState(emptyForm);
    const [formOpen, setFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [campaignForm, setCampaignForm] = useState(emptyCampaignForm);
    const [campaignModalOpen, setCampaignModalOpen] = useState(false);
    const [campaignSaving, setCampaignSaving] = useState(false);

    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [discountsLoading, setDiscountsLoading] = useState(true);
    const [discountsError, setDiscountsError] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [discountForm, setDiscountForm] = useState(emptyDiscountForm);
    const [discountFormOpen, setDiscountFormOpen] = useState(false);
    const [discountSaving, setDiscountSaving] = useState(false);
    const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [eventForm, setEventForm] = useState(emptyEventForm);
    const [eventFormOpen, setEventFormOpen] = useState(false);
    const [eventSaving, setEventSaving] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    const [optedInCount, setOptedInCount] = useState<number | null>(null);
    const [emailForm, setEmailForm] = useState(emptyEmailForm);
    const [emailFormOpen, setEmailFormOpen] = useState(false);
    const [emailSending, setEmailSending] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [emailResult, setEmailResult] = useState<MarketingEmailResult | null>(null);

    const loadEvents = () => {
        setEventsLoading(true);
        calendarEventsApi
            .list()
            .then(setEvents)
            .catch((err) => setEventsError(err instanceof Error ? err.message : 'Failed to load events'))
            .finally(() => setEventsLoading(false));
    };

    const loadDiscounts = () => {
        setDiscountsLoading(true);
        discountsApi
            .list()
            .then(setDiscounts)
            .catch((err) => setDiscountsError(err instanceof Error ? err.message : 'Failed to load discounts'))
            .finally(() => setDiscountsLoading(false));
    };

    const loadCalendarEntries = () => {
        setCalendarLoading(true);
        calendarContextApi
            .list()
            .then((entries) => setCalendarEntries(entries.filter((e) => e.discount_rate > 0 || e.has_event)))
            .catch((err) => setCalendarError(err instanceof Error ? err.message : 'Failed to load calendar events'))
            .finally(() => setCalendarLoading(false));
    };

    const loadMonthEntries = (month: Date) => {
        const start = toIsoDate(month);
        const end = toIsoDate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
        calendarContextApi
            .list({ start, end })
            .then((entries) => {
                const map: Record<string, CalendarContextEntry> = {};
                for (const entry of entries) map[entry.date] = entry;
                setMonthEntries(map);
            })
            .catch(() => setMonthEntries({}));
    };

    useEffect(() => {
        loadCalendarEntries();
        loadDiscounts();
        loadEvents();
        productsApi.categories().then(setCategories).catch(() => {});
        productsApi.list().then(setProducts).catch(() => {});
        marketingApi.optedInCount().then(setOptedInCount).catch(() => {});
    }, []);

    useEffect(() => {
        loadMonthEntries(calendarMonth);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calendarMonth]);

    const findEntry = (date: string) => monthEntries[date] ?? calendarEntries.find((e) => e.date === date);

    const openAddForm = () => {
        setForm(emptyForm);
        setFormOpen(true);
    };

    const handleSelectDay = (date: string) => {
        const existing = findEntry(date);
        setForm({
            date,
            discountPercent: existing && existing.discount_rate > 0 ? String(Math.round(existing.discount_rate * 100)) : '',
            hasEvent: existing?.has_event ?? false,
        });
        setFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.date) return;

        const discount_rate = Math.min(100, Math.max(0, Number(form.discountPercent) || 0)) / 100;

        setSaving(true);
        setCalendarError(null);
        try {
            await calendarContextApi.upsert({ date: form.date, discount_rate, has_event: form.hasEvent });
            setForm(emptyForm);
            setFormOpen(false);
            loadCalendarEntries();
            loadMonthEntries(calendarMonth);
        } catch (err) {
            setCalendarError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (date: string) => {
        setCalendarError(null);
        try {
            await calendarContextApi.remove(date);
            setCalendarEntries((entries) => entries.filter((e) => e.date !== date));
            setMonthEntries((entries) => {
                const next = { ...entries };
                delete next[date];
                return next;
            });
            if (form.date === date) {
                setForm(emptyForm);
                setFormOpen(false);
            }
            if (campaignForm.date === date) {
                setCampaignModalOpen(false);
            }
        } catch (err) {
            setCalendarError(err instanceof Error ? err.message : 'Failed to remove');
        }
    };

    const openEditCampaign = (entry: CalendarContextEntry) => {
        setCampaignForm({
            date: entry.date,
            discountPercent: entry.discount_rate > 0 ? String(Math.round(entry.discount_rate * 100)) : '',
            hasEvent: entry.has_event,
        });
        setCalendarError(null);
        setCampaignModalOpen(true);
    };

    const handleCampaignSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const discount_rate = Math.min(100, Math.max(0, Number(campaignForm.discountPercent) || 0)) / 100;

        setCampaignSaving(true);
        setCalendarError(null);
        try {
            await calendarContextApi.upsert({ date: campaignForm.date, discount_rate, has_event: campaignForm.hasEvent });
            setCampaignModalOpen(false);
            loadCalendarEntries();
            loadMonthEntries(calendarMonth);
        } catch (err) {
            setCalendarError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setCampaignSaving(false);
        }
    };

    const openAddEventForm = () => {
        setEditingEventId(null);
        setEventForm(emptyEventForm);
        setEventFormOpen(true);
    };

    const openEditEventForm = (ev: CalendarEvent) => {
        setEditingEventId(ev.id);
        setEventForm({ date: ev.date, name: ev.name, description: ev.description ?? '' });
        setEventsError(null);
        setEventFormOpen(true);
    };

    const handleEventSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventForm.date || !eventForm.name.trim()) return;

        setEventSaving(true);
        setEventsError(null);
        try {
            const payload = {
                date: eventForm.date,
                name: eventForm.name.trim(),
                description: eventForm.description.trim() || undefined,
            };
            if (editingEventId) {
                await calendarEventsApi.update(editingEventId, payload);
            } else {
                await calendarEventsApi.create(payload);
            }
            setEventForm(emptyEventForm);
            setEditingEventId(null);
            setEventFormOpen(false);
            loadEvents();
        } catch (err) {
            setEventsError(err instanceof Error ? err.message : 'Failed to save event');
        } finally {
            setEventSaving(false);
        }
    };

    const handleEventDelete = async (id: string) => {
        setEventsError(null);
        try {
            await calendarEventsApi.remove(id);
            setEvents((prev) => prev.filter((ev) => ev.id !== id));
            if (editingEventId === id) {
                setEventFormOpen(false);
                setEditingEventId(null);
            }
        } catch (err) {
            setEventsError(err instanceof Error ? err.message : 'Failed to remove event');
        }
    };

    const openEmailForm = (subject?: string) => {
        setEmailForm({ ...emptyEmailForm, subject: subject ?? '' });
        setEmailResult(null);
        setEmailError(null);
        setEmailFormOpen(true);
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailForm.subject.trim() || !emailForm.body.trim()) return;

        const manualEmails =
            emailForm.recipientMode === 'manual'
                ? emailForm.manualEmails
                      .split(/[\n,]/)
                      .map((email) => email.trim())
                      .filter(Boolean)
                : undefined;

        if (emailForm.recipientMode === 'manual' && (!manualEmails || manualEmails.length === 0)) {
            setEmailError('Add at least one recipient email');
            return;
        }

        setEmailSending(true);
        setEmailError(null);
        setEmailResult(null);
        try {
            const result = await marketingApi.send({
                recipientMode: emailForm.recipientMode,
                manualEmails,
                subject: emailForm.subject.trim(),
                body: emailForm.body.trim(),
            });
            setEmailResult(result);
            if (result.failedEmails.length === 0) {
                setEmailForm(emptyEmailForm);
            }
        } catch (err) {
            setEmailError(err instanceof Error ? err.message : 'Failed to send email');
        } finally {
            setEmailSending(false);
        }
    };

    const openAddDiscountForm = () => {
        setEditingDiscountId(null);
        setDiscountForm(emptyDiscountForm);
        setDiscountFormOpen(true);
    };

    const openEditDiscountForm = (discount: Discount) => {
        setEditingDiscountId(discount.id);
        setDiscountForm({
            scope: discount.scope,
            category: discount.category ?? '',
            productId: discount.productId ?? '',
            percentage: String(discount.percentage),
            startDate: discount.startDate,
            endDate: discount.endDate ?? '',
        });
        setDiscountsError(null);
        setDiscountFormOpen(true);
    };

    const handleDiscountSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const percentage = Number(discountForm.percentage);
        if (!discountForm.startDate || !percentage || percentage <= 0) return;

        setDiscountSaving(true);
        setDiscountsError(null);
        try {
            const payload = {
                scope: discountForm.scope,
                category: discountForm.scope === 'category' ? discountForm.category : undefined,
                productId: discountForm.scope === 'product' ? discountForm.productId : undefined,
                percentage,
                startDate: discountForm.startDate,
                endDate: discountForm.endDate || undefined,
            };
            if (editingDiscountId) {
                await discountsApi.update(editingDiscountId, payload);
            } else {
                await discountsApi.create(payload);
            }
            setDiscountForm(emptyDiscountForm);
            setEditingDiscountId(null);
            setDiscountFormOpen(false);
            loadDiscounts();
        } catch (err) {
            setDiscountsError(err instanceof Error ? err.message : 'Failed to save discount');
        } finally {
            setDiscountSaving(false);
        }
    };

    const handleDiscountDelete = async (id: string) => {
        setDiscountsError(null);
        try {
            await discountsApi.remove(id);
            setDiscounts((prev) => prev.filter((d) => d.id !== id));
            if (editingDiscountId === id) {
                setDiscountFormOpen(false);
                setEditingDiscountId(null);
            }
        } catch (err) {
            setDiscountsError(err instanceof Error ? err.message : 'Failed to remove discount');
        }
    };

    const today = toIsoDate(new Date());
    const nextHoliday = calendarEntries
        .filter((e) => e.is_holiday && e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))[0];

    const eventCounts = events.reduce<Record<string, number>>((acc, ev) => {
        acc[ev.date] = (acc[ev.date] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <div className="mx-auto max-w-6xl">
            <h1 className="font-display text-2xl font-semibold">Planning</h1>
            <p className="mt-1 text-sm text-ink/60">
                Planned promotions &amp; events — the sales forecast can&apos;t predict campaigns you haven&apos;t
                told it about.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
                <div className="rounded-2xl border border-black/5 bg-white p-6">
                    <PromotionsCalendar
                        month={calendarMonth}
                        onPrevMonth={() =>
                            setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                        }
                        onNextMonth={() =>
                            setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                        }
                        entries={monthEntries}
                        eventCounts={eventCounts}
                        onSelectDay={handleSelectDay}
                        onAddClick={openAddForm}
                        selectedDate={formOpen ? form.date : null}
                    />

                    {formOpen && (
                        <form
                            onSubmit={handleSubmit}
                            className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-black/10 bg-ink/[0.02] p-4"
                        >
                            <div>
                                <label className="text-xs font-medium text-ink/60">Date</label>
                                <input
                                    type="date"
                                    required
                                    min={toIsoDate(new Date())}
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    className="mt-1 block rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-ink/60">Discount %</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    placeholder="0"
                                    value={form.discountPercent}
                                    onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                                    className="mt-1 block w-24 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                />
                            </div>

                            <label className="flex items-center gap-2 pb-2.5 text-sm text-ink/70">
                                <input
                                    type="checkbox"
                                    checked={form.hasEvent}
                                    onChange={(e) => setForm({ ...form, hasEvent: e.target.checked })}
                                    className="h-4 w-4 rounded border-black/20"
                                />
                                Marketing push (email / ads / influencer)
                            </label>

                            <div className="flex items-center gap-2">
                                <button
                                    type="submit"
                                    disabled={saving || !form.date}
                                    className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
                                >
                                    {saving ? 'Saving…' : 'Save'}
                                </button>

                                {findEntry(form.date) && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(form.date)}
                                        className="text-xs font-medium text-red-500 hover:underline"
                                    >
                                        Remove
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormOpen(false);
                                        setForm(emptyForm);
                                    }}
                                    aria-label="Cancel"
                                    className="rounded-full p-2 text-ink/40 hover:bg-black/5 hover:text-ink"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </form>
                    )}

                    {calendarError && <p className="mt-3 text-sm text-red-500">{calendarError}</p>}
                </div>

                <div className="flex flex-col gap-3">
                    <InfoBlock
                        accentClass="border-l-accent"
                        title="Paydays"
                        description="Spending tends to tick up around payday — the forecast picks up on this automatically."
                        period="5th & 20th of every month"
                    />
                    <InfoBlock
                        accentClass="border-l-emerald-500"
                        title="End of month"
                        description="The final stretch of the month often shows a different spending pattern."
                        period="Last 3 days of each month"
                    />
                    <InfoBlock
                        accentClass="border-l-amber-500"
                        title="Next holiday"
                        description="Store activity usually shifts around federal holidays — factored in automatically."
                        period={
                            nextHoliday
                                ? `${formatShortDate(nextHoliday.date)} · in ${daysFromToday(nextHoliday.date)} days`
                                : 'None in the next 60 days'
                        }
                    />
                </div>
            </div>

            {/* Events */}
            <div className="mt-8 rounded-2xl border border-black/5 bg-white p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-lg font-semibold">Events</h2>
                        <p className="text-xs text-ink/50">
                            Named events tied to the calendar — a day can hold more than one. Creating one flags
                            that date as an event day for the forecast automatically.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => openEmailForm()}
                            className="flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-2 text-xs font-medium text-ink/70 hover:border-black/30 hover:text-ink"
                        >
                            <Mail size={14} />
                            Send event email
                        </button>
                        <button
                            type="button"
                            onClick={openAddEventForm}
                            className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-medium text-paper hover:bg-ink/85"
                        >
                            <CalendarPlus size={14} />
                            Add event
                        </button>
                    </div>
                </div>

                {emailFormOpen && (
                    <form
                        onSubmit={handleEmailSubmit}
                        className="mb-5 space-y-3 rounded-xl border border-black/10 bg-ink/[0.02] p-4"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-4">
                                <label className="flex items-center gap-1.5 text-sm text-ink/70">
                                    <input
                                        type="radio"
                                        name="recipientMode"
                                        checked={emailForm.recipientMode === 'opted_in'}
                                        onChange={() => setEmailForm({ ...emailForm, recipientMode: 'opted_in' })}
                                        className="h-4 w-4 border-black/20"
                                    />
                                    Everyone who opted in
                                    {optedInCount !== null && (
                                        <span className="text-xs text-ink/40">({optedInCount})</span>
                                    )}
                                </label>
                                <label className="flex items-center gap-1.5 text-sm text-ink/70">
                                    <input
                                        type="radio"
                                        name="recipientMode"
                                        checked={emailForm.recipientMode === 'manual'}
                                        onChange={() => setEmailForm({ ...emailForm, recipientMode: 'manual' })}
                                        className="h-4 w-4 border-black/20"
                                    />
                                    Manual list
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEmailFormOpen(false)}
                                aria-label="Cancel"
                                className="rounded-full p-2 text-ink/40 hover:bg-black/5 hover:text-ink"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {emailForm.recipientMode === 'manual' && (
                            <textarea
                                required
                                placeholder="email1@example.com, email2@example.com…"
                                value={emailForm.manualEmails}
                                onChange={(e) => setEmailForm({ ...emailForm, manualEmails: e.target.value })}
                                rows={2}
                                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                            />
                        )}

                        <input
                            required
                            placeholder="Subject"
                            value={emailForm.subject}
                            onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                        />

                        <textarea
                            required
                            placeholder="Write the email…"
                            value={emailForm.body}
                            onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                            rows={5}
                            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                        />

                        {emailError && <p className="text-sm text-red-500">{emailError}</p>}
                        {emailResult && (
                            <p className={`text-sm ${emailResult.failedEmails.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                Sent {emailResult.sentCount} of {emailResult.recipientCount}
                                {emailResult.failedEmails.length > 0 && ` — ${emailResult.failedEmails.length} failed`}.
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={emailSending}
                            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
                        >
                            {emailSending ? 'Sending…' : 'Send event email'}
                        </button>
                    </form>
                )}

                <Modal
                    open={eventFormOpen}
                    onClose={() => {
                        setEventFormOpen(false);
                        setEditingEventId(null);
                    }}
                    title={editingEventId ? 'Edit event' : 'New event'}
                >
                    <form onSubmit={handleEventSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-ink/60">Date</label>
                            <input
                                type="date"
                                required
                                min={toIsoDate(new Date())}
                                value={eventForm.date}
                                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-ink/60">Event name</label>
                            <input
                                required
                                placeholder="Instagram campaign"
                                value={eventForm.name}
                                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-ink/60">
                                Description <span className="text-ink/35">(optional)</span>
                            </label>
                            <textarea
                                placeholder="Details for the team…"
                                value={eventForm.description}
                                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                                rows={3}
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                            />
                        </div>

                        {eventsError && <p className="text-sm text-red-500">{eventsError}</p>}

                        <div className="flex items-center justify-between gap-3 pt-1">
                            {editingEventId ? (
                                <button
                                    type="button"
                                    onClick={() => handleEventDelete(editingEventId)}
                                    className="text-xs font-medium text-red-500 hover:underline"
                                >
                                    Delete event
                                </button>
                            ) : (
                                <span />
                            )}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEventFormOpen(false);
                                        setEditingEventId(null);
                                    }}
                                    className="rounded-full border border-black/10 px-4 py-2 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={eventSaving}
                                    className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
                                >
                                    {eventSaving ? 'Saving…' : editingEventId ? 'Save changes' : 'Add event'}
                                </button>
                            </div>
                        </div>
                    </form>
                </Modal>

                {eventsError && !eventFormOpen && <p className="mb-3 text-sm text-red-500">{eventsError}</p>}

                {eventsLoading ? (
                    <p className="py-3 text-sm text-ink/50">Loading…</p>
                ) : events.length === 0 ? (
                    <p className="py-3 text-sm text-ink/50">No events scheduled in the next 60 days.</p>
                ) : (
                    <div className="scroll-thin max-h-[360px] overflow-y-auto pr-1">
                        {[...events]
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .map((ev) => (
                                <div
                                    key={ev.id}
                                    className="group flex items-center justify-between gap-3 border-b border-black/5 py-3.5 last:border-none"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/50">
                                            <PartyPopper size={16} />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-semibold text-ink">{ev.name}</span>
                                                <span className="flex-shrink-0 rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] font-medium text-ink/60">
                                                    {formatShortDate(ev.date)}
                                                </span>
                                            </div>
                                            {ev.description && (
                                                <p className="mt-1 max-w-md truncate text-xs text-ink/50">
                                                    {ev.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className={rowActionsClass}>
                                        <button
                                            onClick={() => openEmailForm(ev.name)}
                                            aria-label={`Send email about ${ev.name}`}
                                            title="Send event email"
                                            className="text-ink/50 transition-colors hover:text-accent"
                                        >
                                            <Mail size={14} />
                                        </button>
                                        <button
                                            onClick={() => openEditEventForm(ev)}
                                            aria-label={`Edit ${ev.name}`}
                                            title="Edit event"
                                            className="text-ink/50 transition-colors hover:text-emerald-600"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleEventDelete(ev.id)}
                                            aria-label={`Remove ${ev.name}`}
                                            title="Delete event"
                                            className="text-ink/50 transition-colors hover:text-red-500"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Registered campaigns */}
            <div className="mt-8 rounded-2xl border border-black/5 bg-white p-6">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/40">
                    Registered campaigns
                </h3>

                <Modal
                    open={campaignModalOpen}
                    onClose={() => setCampaignModalOpen(false)}
                    title={`Edit ${formatShortDate(campaignForm.date)}`}
                >
                    <form onSubmit={handleCampaignSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-ink/60">Discount %</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                placeholder="0"
                                value={campaignForm.discountPercent}
                                onChange={(e) => setCampaignForm({ ...campaignForm, discountPercent: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-ink/70">
                            <input
                                type="checkbox"
                                checked={campaignForm.hasEvent}
                                onChange={(e) => setCampaignForm({ ...campaignForm, hasEvent: e.target.checked })}
                                className="h-4 w-4 rounded border-black/20"
                            />
                            Marketing push (email / ads / influencer)
                        </label>

                        {calendarError && <p className="text-sm text-red-500">{calendarError}</p>}

                        <div className="flex items-center justify-between gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => handleDelete(campaignForm.date)}
                                className="text-xs font-medium text-red-500 hover:underline"
                            >
                                Delete
                            </button>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCampaignModalOpen(false)}
                                    className="rounded-full border border-black/10 px-4 py-2 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={campaignSaving}
                                    className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
                                >
                                    {campaignSaving ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </div>
                    </form>
                </Modal>

                {calendarLoading ? (
                    <p className="py-3 text-sm text-ink/50">Loading…</p>
                ) : calendarEntries.length === 0 ? (
                    <p className="py-3 text-sm text-ink/50">No planned promotions or events in the next 60 days.</p>
                ) : (
                    <div className="scroll-thin max-h-[360px] overflow-y-auto pr-1">
                        {calendarEntries.map((entry) => (
                            <div
                                key={entry.date}
                                className="group flex items-center justify-between gap-3 border-b border-black/5 py-3.5 last:border-none"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/50">
                                        <CalendarClock size={16} />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-black/10 bg-black/[0.02] px-2.5 py-1 text-xs font-semibold text-ink/70">
                                                {formatShortDate(entry.date)}
                                            </span>
                                            {entry.discount_rate > 0 && (
                                                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                    <Tag size={11} />
                                                    {Math.round(entry.discount_rate * 100)}% off
                                                </span>
                                            )}
                                        </div>
                                        {(entry.has_event || entry.is_holiday) && (
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                {entry.has_event && (
                                                    <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                        <Megaphone size={11} />
                                                        Marketing push
                                                    </span>
                                                )}
                                                {entry.is_holiday && (
                                                    <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-ink/50">
                                                        Holiday
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={rowActionsClass}>
                                    <button
                                        onClick={() => openEditCampaign(entry)}
                                        aria-label={`Edit ${entry.date}`}
                                        title="Edit"
                                        className="text-ink/50 transition-colors hover:text-emerald-600"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(entry.date)}
                                        aria-label={`Remove ${entry.date}`}
                                        title="Delete"
                                        className="text-ink/50 transition-colors hover:text-red-500"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Product discounts */}
            <div className="mt-8 rounded-2xl border border-black/5 bg-white p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-lg font-semibold">Product discounts</h2>
                        <p className="text-xs text-ink/50">
                            Real price cuts shown on the shop, product pages, checkout, and orders — not to be
                            confused with the forecast promotions above.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openAddDiscountForm}
                        className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-medium text-paper hover:bg-ink/85"
                    >
                        <Plus size={14} />
                        Add discount
                    </button>
                </div>

                <Modal
                    open={discountFormOpen}
                    onClose={() => {
                        setDiscountFormOpen(false);
                        setEditingDiscountId(null);
                    }}
                    title={editingDiscountId ? 'Edit discount' : 'New discount'}
                >
                    <form onSubmit={handleDiscountSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-ink/60">Applies to</label>
                            <select
                                value={discountForm.scope}
                                onChange={(e) =>
                                    setDiscountForm({
                                        ...discountForm,
                                        scope: e.target.value as DiscountScope,
                                        category: '',
                                        productId: '',
                                    })
                                }
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                            >
                                <option value="all">All products</option>
                                <option value="category">A category</option>
                                <option value="product">One product</option>
                            </select>
                        </div>

                        {discountForm.scope === 'category' && (
                            <div>
                                <label className="text-xs font-medium text-ink/60">Category</label>
                                <select
                                    required
                                    value={discountForm.category}
                                    onChange={(e) => setDiscountForm({ ...discountForm, category: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                >
                                    <option value="" disabled>
                                        Select…
                                    </option>
                                    {categories.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {discountForm.scope === 'product' && (
                            <div>
                                <label className="text-xs font-medium text-ink/60">Product</label>
                                <select
                                    required
                                    value={discountForm.productId}
                                    onChange={(e) => setDiscountForm({ ...discountForm, productId: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                >
                                    <option value="" disabled>
                                        Select…
                                    </option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-medium text-ink/60">Discount %</label>
                            <input
                                type="number"
                                required
                                min={1}
                                max={100}
                                step={1}
                                placeholder="10"
                                value={discountForm.percentage}
                                onChange={(e) => setDiscountForm({ ...discountForm, percentage: e.target.value })}
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-ink/60">Start date</label>
                                <input
                                    type="date"
                                    required
                                    min={toIsoDate(new Date())}
                                    value={discountForm.startDate}
                                    onChange={(e) => setDiscountForm({ ...discountForm, startDate: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-ink/60">
                                    End date <span className="text-ink/35">(optional)</span>
                                </label>
                                <input
                                    type="date"
                                    min={discountForm.startDate || toIsoDate(new Date())}
                                    value={discountForm.endDate}
                                    onChange={(e) => setDiscountForm({ ...discountForm, endDate: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                />
                            </div>
                        </div>

                        {discountsError && <p className="text-sm text-red-500">{discountsError}</p>}

                        <div className="flex items-center justify-between gap-3 pt-1">
                            {editingDiscountId ? (
                                <button
                                    type="button"
                                    onClick={() => handleDiscountDelete(editingDiscountId)}
                                    className="text-xs font-medium text-red-500 hover:underline"
                                >
                                    Delete discount
                                </button>
                            ) : (
                                <span />
                            )}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDiscountFormOpen(false);
                                        setEditingDiscountId(null);
                                    }}
                                    className="rounded-full border border-black/10 px-4 py-2 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={discountSaving}
                                    className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
                                >
                                    {discountSaving ? 'Saving…' : editingDiscountId ? 'Save changes' : 'Add discount'}
                                </button>
                            </div>
                        </div>
                    </form>
                </Modal>

                {discountsError && !discountFormOpen && <p className="mb-3 text-sm text-red-500">{discountsError}</p>}

                {discountsLoading ? (
                    <p className="py-3 text-sm text-ink/50">Loading…</p>
                ) : discounts.length === 0 ? (
                    <p className="py-3 text-sm text-ink/50">No discounts configured yet.</p>
                ) : (
                    <div className="scroll-thin max-h-[360px] overflow-y-auto pr-1">
                        {discounts.map((discount) => {
                            const status = discountStatus(discount);
                            const statusStyle = discountStatusStyles[status];
                            const ScopeIcon = discountScopeIcon(discount.scope);
                            return (
                                <div
                                    key={discount.id}
                                    className="group flex items-center justify-between gap-3 border-b border-black/5 py-3.5 last:border-none"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/50">
                                            <ScopeIcon size={16} />
                                        </span>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-semibold text-ink">
                                                    {discountLabel(discount)}
                                                </span>
                                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                                                    -{discount.percentage}%
                                                </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <span className="text-xs text-ink/50">
                                                    {formatShortDate(discount.startDate)}
                                                    {discount.endDate && discount.endDate !== discount.startDate
                                                        ? ` – ${formatShortDate(discount.endDate)}`
                                                        : ''}
                                                </span>
                                                <span
                                                    className={`flex items-center gap-1.5 text-[11px] font-medium capitalize ${statusStyle.text}`}
                                                >
                                                    <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                                                    {status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={rowActionsClass}>
                                        <button
                                            onClick={() => openEditDiscountForm(discount)}
                                            aria-label={`Edit discount for ${discountLabel(discount)}`}
                                            title="Edit discount"
                                            className="text-ink/50 transition-colors hover:text-emerald-600"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDiscountDelete(discount.id)}
                                            aria-label={`Remove discount for ${discountLabel(discount)}`}
                                            title="Delete discount"
                                            className="text-ink/50 transition-colors hover:text-red-500"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
