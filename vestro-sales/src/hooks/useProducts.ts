import { useEffect, useMemo, useState } from 'react';
import { getFeaturedProducts, getProducts } from '@/src/lib/product-data';
import type { Product } from '@/src/types';

type UseProductsOptions = {
    featured?: boolean;
    category?: string;
    search?: string;
};

export function useProducts(options: UseProductsOptions = {}) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const data = options.featured ? await getFeaturedProducts() : await getProducts();

                if (active) {
                    setProducts(data);
                    setError(null);
                }
            } catch (err) {
                if (active) {
                    setError(err instanceof Error ? err.message : 'Error loading products');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        setLoading(true);
        load();

        return () => {
            active = false;
        };
    }, [options.featured]);

    const filteredProducts = useMemo(() => {
        const query = (options.search ?? '').trim().toLowerCase();

        return products.filter((product) => {
            const matchesSearch =
                !query ||
                product.name.toLowerCase().includes(query) ||
                product.description.toLowerCase().includes(query);

            const matchesCategory =
                !options.category || options.category === 'all' || product.category === options.category;

            return matchesSearch && matchesCategory;
        });
    }, [options.category, options.search, products]);

    return {
        products: filteredProducts,
        allProducts: products,
        loading,
        error,
    };
}
