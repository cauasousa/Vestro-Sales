'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import Navbar from '@/src/components/Navbar';
import { useCart } from '@/src/hooks/useCart';

export default function CartPage() {
    const { items, subtotal, updateQuantity, removeItem } = useCart();

    return (
        <>
            <Navbar />
            <section className="container-page py-12">
                <h1 className="font-display text-3xl font-semibold">Your cart</h1>
                <p className="mt-2 text-sm text-ink/60">
                    {items.length} item{items.length !== 1 && 's'} in your cart.
                </p>

                {items.length === 0 ? (
                    <div className="mt-16 flex flex-col items-center gap-4 text-center">
                        <ShoppingBag size={36} className="text-ink/20" />
                        <p className="text-sm text-ink/50">Your cart is empty.</p>
                        <Link
                            href="/products"
                            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/85"
                        >
                            Browse products
                        </Link>
                    </div>
                ) : (
                    <div className="mt-8 grid gap-8 lg:grid-cols-3">
                        <div className="space-y-4 lg:col-span-2">
                            {items.map((item) => (
                                <div
                                    key={item.productId}
                                    className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4"
                                >
                                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-ink/5">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : null}
                                    </div>

                                    <div className="flex-1">
                                        <Link
                                            href={`/products/${item.productId}`}
                                            className="font-display text-sm font-semibold hover:underline"
                                        >
                                            {item.name}
                                        </Link>
                                        <p className="mt-1 text-sm text-ink/60">${item.price.toFixed(2)}</p>
                                    </div>

                                    <div className="flex items-center rounded-full border border-black/10">
                                        <button
                                            type="button"
                                            aria-label="Decrease quantity"
                                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                            className="p-2 text-ink/60 hover:text-ink"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                                        <button
                                            type="button"
                                            aria-label="Increase quantity"
                                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                            className="p-2 text-ink/60 hover:text-ink disabled:opacity-30"
                                            disabled={item.quantity >= item.stock}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    <span className="w-20 text-right text-sm font-semibold">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </span>

                                    <button
                                        type="button"
                                        aria-label={`Remove ${item.name}`}
                                        onClick={() => removeItem(item.productId)}
                                        className="rounded-lg p-2 text-ink/40 hover:bg-red-50 hover:text-red-500"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="h-fit rounded-2xl border border-black/5 bg-white p-6">
                            <h2 className="font-display text-lg font-semibold">Order summary</h2>
                            <div className="mt-4 flex items-center justify-between text-sm text-ink/60">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-sm text-ink/60">
                                <span>Shipping</span>
                                <span>Free</span>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4 text-base font-semibold">
                                <span>Total</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>

                            <Link
                                href="/checkout"
                                className="mt-6 block w-full rounded-full bg-ink px-4 py-3 text-center text-sm font-medium text-paper transition hover:bg-ink/85"
                            >
                                Proceed to checkout
                            </Link>
                            <Link
                                href="/products"
                                className="mt-3 block w-full rounded-full border border-black/10 px-4 py-3 text-center text-sm text-ink/70 transition hover:border-black/30"
                            >
                                Continue shopping
                            </Link>
                        </div>
                    </div>
                )}
            </section>
        </>
    );
}
