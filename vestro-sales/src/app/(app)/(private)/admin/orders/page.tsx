'use client';

import { Fragment, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ChevronDown,
    Mail,
    MessageSquare,
    Package,
    Printer,
    Search,
    Truck,
    X,
} from 'lucide-react';
import { ordersApi } from '@/src/lib/api';
import type { Order, OrderStatus } from '@/src/lib/types';

const statusStyles: Record<OrderStatus, string> = {
    placed: 'bg-amber-50 text-amber-600',
    paid: 'bg-emerald-50 text-emerald-600',
    shipped: 'bg-green-100 text-green-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-50 text-red-500',
};

const statusOptions: OrderStatus[] = ['placed', 'paid', 'shipped', 'delivered', 'cancelled'];

const buttonTap = { scale: 0.96 };
const buttonHover = { scale: 1.04, y: -1 };
const buttonSpring = { type: 'spring' as const, stiffness: 400, damping: 20 };

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function printInvoice(order: Order) {
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;

    const rows = order.items
        .map(
            (item) => `
                <tr>
                    <td>${escapeHtml(item.name)}${item.originalPrice != null ? ' <span style="color:#c00;font-size:11px">(discounted)</span>' : ''}</td>
                    <td style="text-align:center">${item.quantity}</td>
                    <td style="text-align:right">${
                        item.originalPrice != null
                            ? `<span style="text-decoration:line-through;color:#999">$${item.originalPrice.toFixed(2)}</span> $${item.price.toFixed(2)}`
                            : `$${item.price.toFixed(2)}`
                    }</td>
                    <td style="text-align:right">$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>`
        )
        .join('');

    win.document.write(`
        <html>
            <head>
                <title>Invoice #${escapeHtml(order.id.slice(0, 8))}</title>
                <style>
                    body { font-family: system-ui, sans-serif; padding: 32px; color: #111; }
                    h1 { font-size: 20px; margin-bottom: 4px; }
                    p { margin: 2px 0; color: #444; font-size: 13px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
                    th, td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; text-align: left; }
                    tfoot td { font-weight: 600; border-top: 2px solid #111; border-bottom: none; }
                </style>
            </head>
            <body>
                <h1>Order #${escapeHtml(order.id.slice(0, 8))}</h1>
                <p>${new Date(order.createdAt).toLocaleString()}</p>
                <p>Status: ${escapeHtml(order.status)}</p>
                <hr style="margin:16px 0;border:none;border-top:1px solid #eee" />
                <p><strong>${escapeHtml(order.customer.fullName)}</strong></p>
                <p>${escapeHtml(order.customer.email)}</p>
                <p>${escapeHtml(order.customer.address)}</p>
                <p>${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.postalCode)}</p>
                ${order.trackingCode ? `<p>Tracking: ${escapeHtml(order.trackingCode)}</p>` : ''}
                <table>
                    <thead>
                        <tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Subtotal</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                        <tr><td colspan="3">Total</td><td style="text-align:right">$${order.subtotal.toFixed(2)}</td></tr>
                    </tfoot>
                </table>
            </body>
        </html>
    `);
    win.document.close();
    win.focus();
    win.print();
}

export default function AdminOrdersPage() {
    return (
        <Suspense fallback={null}>
            <AdminOrdersContent />
        </Suspense>
    );
}

function AdminOrdersContent() {
    const searchParams = useSearchParams();
    const focusOrderId = searchParams.get('order');

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [expandedId, setExpandedId] = useState<string | null>(focusOrderId);
    const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});
    const [savingTrackingId, setSavingTrackingId] = useState<string | null>(null);

    useEffect(() => {
        if (!focusOrderId || orders.length === 0) return;
        document.getElementById(`order-row-${focusOrderId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusOrderId, orders]);

    useEffect(() => {
        ordersApi
            .list()
            .then(setOrders)
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders'))
            .finally(() => setLoading(false));
    }, []);

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase();
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (to) to.setHours(23, 59, 59, 999);

        return orders.filter((order) => {
            if (statusFilter !== 'all' && order.status !== statusFilter) return false;

            if (query) {
                const haystack = `${order.id} ${order.customer.fullName} ${order.customer.email}`.toLowerCase();
                if (!haystack.includes(query)) return false;
            }

            const createdAt = new Date(order.createdAt);
            if (from && createdAt < from) return false;
            if (to && createdAt > to) return false;

            return true;
        });
    }, [orders, search, statusFilter, dateFrom, dateTo]);

    const hasActiveFilters = search !== '' || statusFilter !== 'all' || dateFrom !== '' || dateTo !== '';

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setDateFrom('');
        setDateTo('');
    };

    const toggleExpanded = (order: Order) => {
        setExpandedId((current) => (current === order.id ? null : order.id));
        setTrackingDrafts((drafts) =>
            drafts[order.id] !== undefined ? drafts : { ...drafts, [order.id]: order.trackingCode ?? '' }
        );
    };

    const handleStatusChange = async (orderId: string, status: OrderStatus) => {
        const previous = orders;
        setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, status } : o)));
        setActionError(null);
        try {
            await ordersApi.update(orderId, { status });
        } catch (err) {
            setOrders(previous);
            setActionError(err instanceof Error ? err.message : 'Failed to update status');
        }
    };

    const handleTrackingSave = async (orderId: string) => {
        const trackingCode = trackingDrafts[orderId] ?? '';
        const previous = orders;
        setSavingTrackingId(orderId);
        setActionError(null);
        setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, trackingCode } : o)));
        try {
            await ordersApi.update(orderId, { trackingCode });
        } catch (err) {
            setOrders(previous);
            setActionError(err instanceof Error ? err.message : 'Failed to save tracking code');
        } finally {
            setSavingTrackingId(null);
        }
    };

    return (
        <div className="mx-auto max-w-6xl">
            <div>
                <h1 className="font-display text-2xl font-semibold">Orders</h1>
                <p className="mt-1 text-sm text-ink/60">Every order placed in the store, newest first.</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by order ID or customer…"
                        className="w-full rounded-full border border-black/10 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
                    />
                </div>

                <div className="flex items-center gap-1.5">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-ink/70 outline-none focus:border-accent"
                    />
                    <span className="text-xs text-ink/40">to</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-ink/70 outline-none focus:border-accent"
                    />
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-ink/50 hover:text-ink"
                    >
                        <X size={13} />
                        Clear
                    </button>
                )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                {(['all', ...statusOptions] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                            statusFilter === status
                                ? 'bg-ink text-paper'
                                : status === 'all'
                                  ? 'bg-black/5 text-ink/60 hover:bg-black/10'
                                  : `${statusStyles[status]} opacity-70 hover:opacity-100`
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            {actionError && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                    {actionError}
                    <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">
                        <X size={14} />
                    </button>
                </div>
            )}

            {loading ? (
                <p className="mt-8 text-sm text-ink/50">Loading orders…</p>
            ) : orders.length === 0 ? (
                <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-black/5 bg-white p-12 text-center">
                    <Package size={28} className="text-ink/20" />
                    <p className="text-sm text-ink/50">No orders yet.</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-black/5 bg-white p-12 text-center">
                    <Search size={28} className="text-ink/20" />
                    <p className="text-sm text-ink/50">No orders match your filters.</p>
                </div>
            ) : (
                <div className="scroll-thin mt-6 max-h-[560px] overflow-auto rounded-2xl border border-black/5 bg-white">
                    <table className="w-full min-w-[860px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-ink/50">
                            <tr>
                                <th className="sticky top-0 z-10 border-b border-black/10 bg-[#F1F0ED] px-4 py-3">
                                    Order
                                </th>
                                <th className="sticky top-0 z-10 border-b border-black/10 bg-[#F1F0ED] px-4 py-3">
                                    Customer
                                </th>
                                <th className="sticky top-0 z-10 border-b border-black/10 bg-[#F1F0ED] px-4 py-3">
                                    Status
                                </th>
                                <th className="sticky top-0 z-10 border-b border-black/10 bg-[#F1F0ED] px-4 py-3">
                                    Items
                                </th>
                                <th className="sticky top-0 z-10 border-b border-black/10 bg-[#F1F0ED] px-4 py-3">
                                    Total
                                </th>
                                <th className="sticky top-0 z-10 border-b border-black/10 bg-[#F1F0ED] px-4 py-3 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order) => {
                                const isExpanded = expandedId === order.id;
                                const [firstItem, ...restItems] = order.items;

                                return (
                                    <Fragment key={order.id}>
                                        <tr
                                            id={`order-row-${order.id}`}
                                            className={`border-t border-black/5 align-top ${
                                                focusOrderId === order.id ? 'bg-accent/5' : ''
                                            }`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-display text-sm font-semibold">
                                                        #{order.id.slice(0, 8)}
                                                    </span>
                                                    {!order.customerId && (
                                                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-ink/50">
                                                            Guest
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-xs text-ink/40">
                                                    {new Date(order.createdAt).toLocaleString()}
                                                </p>
                                            </td>

                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium">{order.customer.fullName}</p>
                                                <p className="text-xs text-ink/50">{order.customer.email}</p>
                                            </td>

                                            <td className="px-4 py-3">
                                                <select
                                                    value={order.status}
                                                    onChange={(e) =>
                                                        handleStatusChange(order.id, e.target.value as OrderStatus)
                                                    }
                                                    className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium capitalize outline-none ${statusStyles[order.status]}`}
                                                >
                                                    {statusOptions.map((status) => (
                                                        <option key={status} value={status}>
                                                            {status}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 text-xs text-ink/70">
                                                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-ink/5">
                                                        {firstItem?.image_url && (
                                                            <img
                                                                src={firstItem.image_url}
                                                                alt={firstItem.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                    <span className="max-w-[140px] truncate">
                                                        {firstItem?.name} <span className="text-ink/40">× {firstItem?.quantity}</span>
                                                    </span>
                                                </div>
                                                {restItems.length > 0 && (
                                                    <button
                                                        onClick={() => toggleExpanded(order)}
                                                        className="mt-1.5 text-xs font-medium text-accent hover:underline"
                                                    >
                                                        +{restItems.length} other item{restItems.length > 1 ? 's' : ''}
                                                    </button>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 font-medium">${order.subtotal.toFixed(2)}</td>

                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <motion.a
                                                        href={`mailto:${order.customer.email}`}
                                                        whileHover={buttonHover}
                                                        whileTap={buttonTap}
                                                        transition={buttonSpring}
                                                        aria-label="Email customer"
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-ink/60 hover:border-black/30 hover:text-ink"
                                                    >
                                                        <Mail size={14} />
                                                    </motion.a>

                                                    {order.customerId ? (
                                                        <Link href={`/admin/chat?customer=${order.customerId}`}>
                                                            <motion.span
                                                                whileHover={buttonHover}
                                                                whileTap={buttonTap}
                                                                transition={buttonSpring}
                                                                aria-label="Chat with customer"
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-paper"
                                                            >
                                                                <MessageSquare size={14} />
                                                            </motion.span>
                                                        </Link>
                                                    ) : (
                                                        <span
                                                            title="No account to chat with — guest checkout"
                                                            className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg bg-black/5 text-ink/30"
                                                        >
                                                            <MessageSquare size={14} />
                                                        </span>
                                                    )}

                                                    <motion.button
                                                        onClick={() => printInvoice(order)}
                                                        whileHover={buttonHover}
                                                        whileTap={buttonTap}
                                                        transition={buttonSpring}
                                                        aria-label="Print invoice"
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-ink/60 hover:border-black/30 hover:text-ink"
                                                    >
                                                        <Printer size={14} />
                                                    </motion.button>

                                                    <motion.button
                                                        onClick={() => toggleExpanded(order)}
                                                        whileHover={buttonHover}
                                                        whileTap={buttonTap}
                                                        transition={buttonSpring}
                                                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-ink/60 hover:border-black/30 hover:text-ink"
                                                    >
                                                        <ChevronDown
                                                            size={14}
                                                            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                        />
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>

                                        {isExpanded && (
                                            <tr className="border-t border-black/5 bg-ink/[0.015]">
                                                <td colSpan={6} className="px-4 py-4">
                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        <div>
                                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
                                                                Items
                                                            </p>
                                                            <div className="space-y-2.5">
                                                                {order.items.map((item) => (
                                                                    <div key={item.productId} className="flex items-center gap-3 text-sm">
                                                                        <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-ink/5">
                                                                            {item.image_url && (
                                                                                <img
                                                                                    src={item.image_url}
                                                                                    alt={item.name}
                                                                                    className="h-full w-full object-cover"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        <span className="flex-1 text-ink/70">
                                                                            {item.name} <span className="text-ink/40">× {item.quantity}</span>
                                                                            {item.originalPrice != null && (
                                                                                <span className="ml-1.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                                                                                    -{Math.round((1 - item.price / item.originalPrice) * 100)}%
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                        <span className="text-right">
                                                                            {item.originalPrice != null && (
                                                                                <span className="mr-1.5 text-xs text-ink/35 line-through">
                                                                                    ${(item.originalPrice * item.quantity).toFixed(2)}
                                                                                </span>
                                                                            )}
                                                                            <span className="font-medium">
                                                                                ${(item.price * item.quantity).toFixed(2)}
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
                                                                Shipping
                                                            </p>
                                                            <p className="text-sm text-ink/70">
                                                                {order.customer.address}, {order.customer.city} {order.customer.postalCode}
                                                            </p>

                                                            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink/40">
                                                                Tracking code
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="relative flex-1 max-w-[240px]">
                                                                    <Truck size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/30" />
                                                                    <input
                                                                        value={trackingDrafts[order.id] ?? ''}
                                                                        onChange={(e) =>
                                                                            setTrackingDrafts((drafts) => ({
                                                                                ...drafts,
                                                                                [order.id]: e.target.value,
                                                                            }))
                                                                        }
                                                                        placeholder="Add tracking code…"
                                                                        className="w-full rounded-lg border border-black/10 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-accent"
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={() => handleTrackingSave(order.id)}
                                                                    disabled={savingTrackingId === order.id}
                                                                    className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
                                                                >
                                                                    {savingTrackingId === order.id ? 'Saving…' : 'Save'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
