'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';
import { useCart } from '@/src/hooks/useCart';
import type { Product } from '@/src/lib/types';

export default function AddToCartPanel({ product }: { product: Product }) {
    const router = useRouter();
    const { addItem } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);

    const outOfStock = product.stock <= 0;

    const handleAddToCart = () => {
        addItem(product, quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    const handleBuyNow = () => {
        addItem(product, quantity);
        router.push('/checkout');
    };

    return (
        <div className="mt-8">
            {!outOfStock && (
                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-ink/60">Quantity</span>
                    <div className="flex items-center rounded-full border border-black/10">
                        <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="p-2 text-ink/60 hover:text-ink disabled:opacity-30"
                            disabled={quantity <= 1}
                        >
                            <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm">{quantity}</span>
                        <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                            className="p-2 text-ink/60 hover:text-ink disabled:opacity-30"
                            disabled={quantity >= product.stock}
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <span className="text-xs text-ink/50">{product.stock} available</span>
                </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={outOfStock}
                    className="flex-1 rounded-full border border-ink px-6 py-3 text-sm font-medium text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {outOfStock ? 'Sold out' : added ? 'Added ✓' : 'Add to cart'}
                </button>
                <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={outOfStock}
                    className="flex-1 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Buy now
                </button>
            </div>
        </div>
    );
}
