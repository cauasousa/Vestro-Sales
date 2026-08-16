import type { Role } from '@/src/types';

export type {
    CartItem,
    Discount,
    DiscountCreateInput,
    DiscountScope,
    Order,
    OrderCreateInput,
    OrderCustomer,
    OrderStatus,
    Product,
    ProductCategory,
    ProductCreateInput,
    Role,
    UserCreateInput,
} from '@/src/types';

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
    accepts_marketing: boolean;
};

export type SalesForecastPoint = {
    date: string;
    actual: number | null;
    predicted: number | null;
};

export type CalendarContextEntry = {
    date: string;
    is_payday: boolean;
    is_end_of_month: boolean;
    days_until_holiday: number;
    discount_rate: number;
    is_holiday: boolean;
    has_event: boolean;
};

export type CalendarEvent = {
    id: string;
    date: string;
    name: string;
    description?: string | null;
    createdAt: string;
};

export type CalendarEventCreateInput = {
    date: string;
    name: string;
    description?: string | null;
};
