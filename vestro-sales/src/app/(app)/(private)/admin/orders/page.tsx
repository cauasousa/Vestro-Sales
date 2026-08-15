'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Package, UserRound } from 'lucide-react';
import { ordersApi } from '@/src/lib/api';
import type { Order, OrderStatus } from '@/src/lib/types';

const statusStyles: Record<OrderStatus, string> = {
    placed: 'bg-black/5 text-ink/70',
    paid: 'bg-blue-50 text-blue-600',
    shipped: 'bg-amber-50 text-amber-600',
    delivered: 'bg-emerald-50 text-emerald-600',
    cancelled: 'bg-red-50 text-red-500',
};

const buttonTap = { scale: 0.96 };
const buttonHover = { scale: 1.04, y: -1 };
const buttonSpring = { type: 'spring' as const, stiffness: 400, damping: 20 };

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        ordersApi
            .list()
            .then(setOrders)
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="max-w-4xl">
            <div>
                <h1 className="font-display text-2xl font-semibold">Orders</h1>
                <p className="mt-1 text-sm text-ink/60">Every order placed in the store, newest first.</p>
            </div>

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

            {loading ? (
                <p className="mt-8 text-sm text-ink/50">Loading orders…</p>
            ) : orders.length === 0 ? (
                <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-black/5 bg-white p-12 text-center">
                    <Package size={28} className="text-ink/20" />
                    <p className="text-sm text-ink/50">No orders yet.</p>
                </div>
            ) : (
                <div className="mt-6 space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="rounded-2xl border border-black/5 bg-white p-6">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-display text-sm font-semibold">
                                            #{order.id.slice(0, 8)}
                                        </span>
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${statusStyles[order.status]}`}
                                        >
                                            {order.status}
                                        </span>
                                        {!order.customerId && (
                                            <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs text-ink/50">
                                                Guest
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-ink/50">
                                        {new Date(order.createdAt).toLocaleString()}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2.5 rounded-xl bg-ink/[0.03] py-1.5 pl-2.5 pr-3.5">
                                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink/50">
                                        <UserRound size={15} />
                                    </span>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-ink">{order.customer.fullName}</p>
                                        <p className="text-xs text-ink/50">{order.customer.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3 border-t border-black/5 pt-4">
                                {order.items.map((item) => (
                                    <div key={item.productId} className="flex items-center gap-3 text-sm">
                                        <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-ink/5">
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
                                        </span>
                                        <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
                                <span className="text-sm font-semibold">
                                    Total ${order.subtotal.toFixed(2)}
                                </span>

                                <div className="flex items-center gap-2">
                                    <motion.a
                                        href={`mailto:${order.customer.email}`}
                                        whileHover={buttonHover}
                                        whileTap={buttonTap}
                                        transition={buttonSpring}
                                        className="flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-2 text-xs font-medium text-ink/70 transition-colors hover:border-black/30 hover:text-ink"
                                    >
                                        <Mail size={13} />
                                        Email
                                    </motion.a>

                                    {order.customerId ? (
                                        <Link href={`/admin/chat?customer=${order.customerId}`} className="inline-block">
                                            <motion.span
                                                whileHover={buttonHover}
                                                whileTap={buttonTap}
                                                transition={buttonSpring}
                                                className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-medium text-paper"
                                            >
                                                <MessageSquare size={13} />
                                                Chat
                                            </motion.span>
                                        </Link>
                                    ) : (
                                        <span
                                            title="No account to chat with — guest checkout"
                                            className="flex cursor-not-allowed items-center gap-1.5 rounded-full bg-black/5 px-3.5 py-2 text-xs font-medium text-ink/30"
                                        >
                                            <MessageSquare size={13} />
                                            Chat
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
