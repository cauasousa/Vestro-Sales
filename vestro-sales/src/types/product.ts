export type ProductCategory = 'accessories' | 'audio' | 'desk' | 'mobile' | 'network' | 'work';

export type Product = {
    id: string;
    name: string;
    description: string;
    category: ProductCategory;
    price: number;
    stock: number;
    image_url: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    discount_percent?: number | null;
    discounted_price?: number | null;
};

export type DiscountScope = 'all' | 'category' | 'product';

export type Discount = {
    id: string;
    scope: DiscountScope;
    category?: string | null;
    productId?: string | null;
    productName?: string | null;
    percentage: number;
    startDate: string;
    endDate?: string | null;
    createdAt: string;
};

export type DiscountCreateInput = {
    scope: DiscountScope;
    category?: string | null;
    productId?: string | null;
    percentage: number;
    startDate: string;
    endDate?: string | null;
};

export type ProductCreateInput = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'is_active'> & {
    is_active?: boolean;
};
