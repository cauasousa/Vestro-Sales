'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageCircle, Package } from 'lucide-react';
import Navbar from '@/src/components/Navbar';
import { useAuth } from '@/src/hooks/useAuth';
import { ordersApi } from '@/src/lib/api';
import type { Order, OrderStatus } from '@/src/lib/types';

const statusStyles: Record<OrderStatus, string> = {
    placed: 'bg-black/5 text-ink/70',
    paid: 'bg-blue-50 text-blue-600',
    shipped: 'bg-amber-50 text-amber-600',
    delivered: 'bg-emerald-50 text-emerald-600',
    cancelled: 'bg-red-50 text-red-500',
};

export default function OrdersPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;

        ordersApi
            .list()
            .then(setOrders)
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders'))
            .finally(() => setLoading(false));
    }, [user]);

    if (authLoading || !user) {
        return (
            <>
                <Navbar />
                <section className="container-page py-24 text-center text-sm text-ink/50">Loading…</section>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <section className="container-page py-12">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display text-3xl font-semibold">Your orders</h1>
                        <p className="mt-2 text-sm text-ink/60">Everything you've bought from us, most recent first.</p>
                    </div>
                    <Link href="/support">
                        <motion.span
                            whileHover={{ scale: 1.04, y: -1 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="flex items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium text-ink/70"
                        >
                            <MessageCircle size={16} />
                            Contact seller
                        </motion.span>
                    </Link>
                </div>

                {error && <p className="mt-6 text-sm text-red-500">{error}</p>}

                {loading ? (
                    <p className="mt-10 text-sm text-ink/50">Loading orders…</p>
                ) : orders.length === 0 ? (
                    <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-black/5 bg-white p-16 text-center">
                        <Package size={32} className="text-ink/20" />
                        <p className="text-sm text-ink/50">You haven't placed any orders yet.</p>
                        <Link
                            href="/products"
                            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/85"
                        >
                            Browse products
                        </Link>
                    </div>
                ) : (
                    <div className="mt-8 space-y-4">
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
                                        </div>
                                        <p className="mt-1 text-xs text-ink/50">
                                            {new Date(order.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold">${order.subtotal.toFixed(2)}</span>
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
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
