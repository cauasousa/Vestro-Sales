import type { Product, ProductCreateInput } from '@/src/types';

export function isProduct(value: unknown): value is Product {
    if (!value || typeof value !== 'object') return false;

    const item = value as Record<string, unknown>;

    return (
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.description === 'string' &&
        typeof item.category === 'string' &&
        typeof item.price === 'number' &&
        typeof item.stock === 'number' &&
        typeof item.image_url === 'string' &&
        typeof item.is_active === 'boolean' &&
        typeof item.created_at === 'string' &&
        typeof item.updated_at === 'string'
    );
}

export function validateProducts(value: unknown): value is Product[] {
    return Array.isArray(value) && value.every((item) => isProduct(item));
}

export function normalizeProductCreate(input: Partial<ProductCreateInput>): ProductCreateInput {
    return {
        name: String(input.name ?? ''),
        description: String(input.description ?? ''),
        category: (input.category as Product['category']) ?? 'accessories',
        price: Number(input.price ?? 0),
        stock: Number(input.stock ?? 0),
        image_url: String(input.image_url ?? ''),
        is_active: input.is_active ?? true,
    };
}
