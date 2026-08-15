import mockProducts from '@/src/app/(app)/(public)/data/products';
import type { Product, ProductCreateInput } from '@/src/types';

const STORAGE_KEY = 'vestro_products';

function readProducts(): Product[] {
    if (typeof window === 'undefined') return mockProducts;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockProducts));
        return mockProducts;
    }

    try {
        return JSON.parse(stored) as Product[];
    } catch {
        return mockProducts;
    }
}

function writeProducts(products: Product[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export async function getProducts(): Promise<Product[]> {
    return readProducts();
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
    return readProducts().slice(0, limit);
}

export async function getProductById(id: string): Promise<Product | null> {
    return readProducts().find((product) => product.id === id) ?? null;
}

export async function getCategories(): Promise<string[]> {
    return Array.from(new Set(readProducts().map((product) => product.category)));
}

export function createProduct(input: ProductCreateInput): Product {
    const now = new Date().toISOString();
    const product: Product = {
        ...input,
        id: `product-${Date.now().toString(36)}`,
        is_active: input.is_active ?? true,
        created_at: now,
        updated_at: now,
    };

    writeProducts([product, ...readProducts()]);
    return product;
}

export function updateProduct(id: string, input: Partial<ProductCreateInput>): Product | null {
    const products = readProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const updated: Product = { ...products[index], ...input, updated_at: new Date().toISOString() };
    const next = [...products];
    next[index] = updated;
    writeProducts(next);
    return updated;
}

export function deleteProduct(id: string) {
    writeProducts(readProducts().filter((p) => p.id !== id));
}

const productData = {
    getProducts,
    getFeaturedProducts,
    getProductById,
    getCategories,
    createProduct,
    updateProduct,
    deleteProduct,
};

export default productData;
