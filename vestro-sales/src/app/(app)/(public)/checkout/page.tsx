'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/src/components/Navbar';
import { useCart } from '@/src/hooks/useCart';
import { createOrder } from '@/src/lib/orders';

const emptyForm = {
    fullName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
};

export default function CheckoutPage() {
    const router = useRouter();
    const { items, subtotal, clearCart } = useCart();
    const [form, setForm] = useState(emptyForm);
    const [placing, setPlacing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPlacing(true);

        const order = createOrder(items, {
            fullName: form.fullName,
            email: form.email,
            address: form.address,
            city: form.city,
            postalCode: form.postalCode,
        });

        clearCart();
        router.push(`/checkout/success?order=${order.id}`);
    };

    if (items.length === 0) {
        return (
            <>
                <Navbar />
                <section className="container-page py-24 text-center">
                    <p className="text-sm text-ink/50">Your cart is empty — add products before checking out.</p>
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

    return (
        <>
            <Navbar />
            <section className="container-page py-12">
                <h1 className="font-display text-3xl font-semibold">Checkout</h1>
                <p className="mt-2 text-sm text-ink/60">Complete your purchase below.</p>

                <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <div className="rounded-2xl border border-black/5 bg-white p-6">
                            <h2 className="font-display text-lg font-semibold">Shipping details</h2>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-ink/60">Full name</label>
                                    <input
                                        required
                                        value={form.fullName}
                                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-ink/60">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-ink/60">Address</label>
                                    <input
                                        required
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-ink/60">City</label>
                                        <input
                                            required
                                            value={form.city}
                                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                                            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-ink/60">Postal code</label>
                                        <input
                                            required
                                            value={form.postalCode}
                                            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                                            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-black/5 bg-white p-6">
                            <h2 className="font-display text-lg font-semibold">Payment</h2>
                            <p className="mt-1 text-xs text-ink/50">Demo checkout — no real payment is processed.</p>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-ink/60">Card number</label>
                                    <input
                                        required
                                        placeholder="4242 4242 4242 4242"
                                        value={form.cardNumber}
                                        onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-ink/60">Expiry</label>
                                        <input
                                            required
                                            placeholder="MM/YY"
                                            value={form.expiry}
                                            onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                                            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-ink/60">CVC</label>
                                        <input
                                            required
                                            placeholder="123"
                                            value={form.cvc}
                                            onChange={(e) => setForm({ ...form, cvc: e.target.value })}
                                            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-fit rounded-2xl border border-black/5 bg-white p-6">
                        <h2 className="font-display text-lg font-semibold">Order summary</h2>
                        <div className="mt-4 space-y-3">
                            {items.map((item) => (
                                <div key={item.productId} className="flex items-center justify-between text-sm">
                                    <span className="text-ink/70">
                                        {item.name} <span className="text-ink/40">× {item.quantity}</span>
                                    </span>
                                    <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4 text-base font-semibold">
                            <span>Total</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>

                        <button
                            type="submit"
                            disabled={placing}
                            className="mt-6 w-full rounded-full bg-ink px-4 py-3 text-sm font-medium text-paper transition hover:bg-ink/85 disabled:opacity-50"
                        >
                            {placing ? 'Placing order…' : 'Place order'}
                        </button>
                    </div>
                </form>
            </section>
        </>
    );
}
