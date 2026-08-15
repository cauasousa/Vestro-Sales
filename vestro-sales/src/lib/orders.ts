import type { CartItem, Order } from '@/src/types';

const STORAGE_KEY = 'vestro_last_order';

export function createOrder(items: CartItem[], customer: Order['customer']): Order {
    const order: Order = {
        id: `order-${Date.now().toString(36)}`,
        items,
        subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        customer,
        createdAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    return order;
}

export function getLastOrder(): Order | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
        return JSON.parse(stored) as Order;
    } catch {
        return null;
    }
}
