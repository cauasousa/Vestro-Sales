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
};

export type ProductCreateInput = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'is_active'> & {
    is_active?: boolean;
};
