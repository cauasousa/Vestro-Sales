import type { Role } from '@/src/types';

export type { Product, ProductCategory, ProductCreateInput, Role, User } from '@/src/types';

export type Sale = {
    id: string;
    product_id: string | null;
    customer_id: string | null;
    quantity: number;
    total_amount: number;
    created_at: string;
};

export type Profile = {
    id: string;
    email: string;
    full_name: string | null;
    role: Role;
    created_at: string;
};

export type SalesForecastPoint = {
    date: string;
    actual: number | null;
    predicted: number | null;
};
