'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem, Product } from '@/src/types';

const STORAGE_KEY = 'vestro_cart';

type CartContextValue = {
    items: CartItem[];
    itemCount: number;
    subtotal: number;
    addItem: (product: Product, quantity?: number) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setItems(JSON.parse(stored));
            } catch {
                setItems([]);
            }
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (hydrated) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        }
    }, [items, hydrated]);

    const addItem = (product: Product, quantity = 1) => {
        setItems((prev) => {
            const existing = prev.find((item) => item.productId === product.id);
            const maxQuantity = product.stock;

            if (existing) {
                return prev.map((item) =>
                    item.productId === product.id
                        ? { ...item, quantity: Math.min(item.quantity + quantity, maxQuantity) }
                        : item
                );
            }

            return [
                ...prev,
                {
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    image_url: product.image_url,
                    stock: product.stock,
                    quantity: Math.min(quantity, maxQuantity),
                },
            ];
        });
    };

    const removeItem = (productId: string) => {
        setItems((prev) => prev.filter((item) => item.productId !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        setItems((prev) =>
            prev
                .map((item) =>
                    item.productId === productId
                        ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const clearCart = () => setItems([]);

    const { itemCount, subtotal } = useMemo(
        () => ({
            itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
            subtotal: items.reduce((sum, item) => sum + item.quantity * item.price, 0),
        }),
        [items]
    );

    return (
        <CartContext.Provider
            value={{ items, itemCount, subtotal, addItem, removeItem, updateQuantity, clearCart }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return ctx;
}
