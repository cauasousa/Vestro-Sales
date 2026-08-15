import { productsApi } from '@/src/lib/api';
import type { Product, ProductCreateInput } from '@/src/types';

function normalize(product: Product): Product {
    return {
        ...product,
        description: product.description ?? '',
        image_url: product.image_url ?? '',
    };
}

export async function getProducts(): Promise<Product[]> {
    const products = await productsApi.list();
    return products.map(normalize);
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
    const products = await productsApi.list({ featured: true, limit });
    return products.map(normalize);
}

export async function getProductById(id: string): Promise<Product | null> {
    try {
        return normalize(await productsApi.get(id));
    } catch {
        return null;
    }
}

export async function getCategories(): Promise<string[]> {
    return productsApi.categories();
}

export async function createProduct(input: ProductCreateInput): Promise<Product> {
    return normalize(await productsApi.create(input));
}

export async function updateProduct(id: string, input: Partial<ProductCreateInput>): Promise<Product> {
    return normalize(await productsApi.update(id, input));
}

export async function deleteProduct(id: string): Promise<void> {
    await productsApi.remove(id);
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
