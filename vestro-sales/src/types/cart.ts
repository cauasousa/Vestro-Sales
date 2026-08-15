export type CartItem = {
    productId: string;
    name: string;
    price: number;
    image_url: string;
    stock: number;
    quantity: number;
};

export type Order = {
    id: string;
    items: CartItem[];
    subtotal: number;
    customer: {
        fullName: string;
        email: string;
        address: string;
        city: string;
        postalCode: string;
    };
    createdAt: string;
};
