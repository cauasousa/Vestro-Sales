export type CartItem = {
    productId: string;
    name: string;
    price: number;
    originalPrice?: number | null;
    image_url: string;
    stock: number;
    quantity: number;
};

export type OrderStatus = 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export type OrderCustomer = {
    fullName: string;
    email: string;
    address: string;
    city: string;
    postalCode: string;
};

export type Order = {
    id: string;
    customerId?: string | null;
    items: CartItem[];
    subtotal: number;
    status: OrderStatus;
    trackingCode?: string | null;
    customer: OrderCustomer;
    createdAt: string;
};

export type OrderCreateInput = {
    items: CartItem[];
    customer: OrderCustomer;
};
