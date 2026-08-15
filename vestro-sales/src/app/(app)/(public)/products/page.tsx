'use client';

import { useMemo, useState } from 'react';
import Navbar from '@/src/components/Navbar';
import ProductCard from '@/src/components/ProductCard';
import { useProducts } from '@/src/hooks/useProducts';
import { Search } from 'lucide-react';

export default function ProductsPage() {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const { products: filteredProducts, allProducts, loading, error } = useProducts({ category, search });

    const categories = useMemo(
        () => ['all', ...Array.from(new Set(allProducts.map((p) => p.category)))],
        [allProducts]
    );

    return (
        <>
            <Navbar />
            <section className="container-page py-12">
                <h1 className="font-display text-3xl font-semibold">Shop</h1>
                <p className="mt-2 text-sm text-ink/60">
                    {filteredProducts.length} product{filteredProducts.length !== 1 && 's'} available.
                </p>

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 sm:w-72">
                        <Search size={16} className="text-muted" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search products..."
                            className="w-full bg-transparent text-sm outline-none"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {categories.map((c) => (
                            <button
                                key={c}
                                onClick={() => setCategory(c)}
                                className={`rounded-full border px-4 py-1.5 text-xs capitalize transition ${category === c
                                    ? 'border-ink bg-ink text-paper'
                                    : 'border-black/10 text-ink/60 hover:border-black/30'
                                    }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </p>
                )}

                <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
                    {loading && <p className="col-span-full text-sm text-ink/50">Loading products…</p>}
                    {!loading && filteredProducts.length === 0 && (
                        <p className="col-span-full text-sm text-ink/50">No products match your search.</p>
                    )}
                    {filteredProducts.map((p) => (
                        <ProductCard key={p.id} product={p} />
                    ))}
                </div>
            </section>
        </>
    );
}
