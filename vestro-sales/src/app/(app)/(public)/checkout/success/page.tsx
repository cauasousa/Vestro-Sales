'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import Navbar from '@/src/components/Navbar';
import { ordersApi } from '@/src/lib/api';
import type { Order } from '@/src/types';

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<Navbar />}>
            <CheckoutSuccessContent />
        </Suspense>
    );
}

function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('order');
    const [order, setOrder] = useState<Order | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId) {
            setError('No order id provided.');
            return;
        }

        ordersApi
            .get(orderId)
            .then(setOrder)
            .catch((err) => setError(err instanceof Error ? err.message : 'Order not found'));
    }, [orderId]);

    if (error) {
        return (
            <>
                <Navbar />
                <section className="container-page py-24 text-center">
                    <p className="text-sm text-ink/50">{error}</p>
                    <Link
                        href="/products"
                        className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/85"
                    >
                        Browse products
                    </Link>
                </section>
            </>
        );
    }

    if (!order) {
        return (
            <>
                <Navbar />
                <section className="container-page py-24" />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <section className="container-page flex flex-col items-center py-16 text-center">
                <CheckCircle2 size={48} className="text-emerald-500" />
                <h1 className="mt-4 font-display text-3xl font-semibold">Order confirmed</h1>
                <p className="mt-2 text-sm text-ink/60">
                    Thanks, {order.customer.fullName.split(' ')[0] || 'there'} — your order{' '}
                    <span className="font-medium text-ink">#{order.id.slice(0, 8)}</span> has been placed.
                </p>

                <div className="mt-10 w-full max-w-md rounded-2xl border border-black/5 bg-white p-6 text-left">
                    <h2 className="font-display text-lg font-semibold">Order summary</h2>
                    <div className="mt-4 space-y-3">
                        {order.items.map((item) => (
                            <div key={item.productId} className="flex items-center gap-3 text-sm">
                                <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-ink/5">
                                    {item.image_url && (
                                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                    )}
                                </div>
                                <span className="flex-1 text-ink/70">
                                    {item.name} <span className="text-ink/40">× {item.quantity}</span>
                                </span>
                                <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4 text-base font-semibold">
                        <span>Total</span>
                        <span>${order.subtotal.toFixed(2)}</span>
                    </div>

                    <div className="mt-6 border-t border-black/5 pt-4 text-sm text-ink/60">
                        <p className="font-medium text-ink">Shipping to</p>
                        <p className="mt-1">{order.customer.address}</p>
                        <p>
                            {order.customer.city}, {order.customer.postalCode}
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <Link
                        href="/products"
                        className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition hover:bg-ink/85"
                    >
                        Continue shopping
                    </Link>
                    {order.customerId && (
                        <Link
                            href="/orders"
                            className="rounded-full border border-black/10 px-6 py-3 text-sm text-ink/70 transition hover:border-black/30"
                        >
                            View my orders
                        </Link>
                    )}
                </div>
            </section>
        </>
    );
}
