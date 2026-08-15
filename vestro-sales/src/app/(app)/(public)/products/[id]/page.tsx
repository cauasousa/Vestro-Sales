'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/src/components/Navbar';
import ProductCard from '@/src/components/ProductCard';
import AddToCartPanel from '@/src/components/AddToCartPanel';
import { Reveal, RevealContainer, RevealItem } from '@/src/components/Reveal';
import { useProducts } from '@/src/hooks/useProducts';

export default function ProductDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { allProducts, loading, error } = useProducts();

    const product = allProducts.find((p) => p.id === id) ?? null;

    if (loading) {
        return (
            <>
                <Navbar />
                <section className="container-page py-24 text-center">
                    <p className="text-sm text-ink/50">Loading product…</p>
                </section>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Navbar />
                <section className="container-page py-24 text-center">
                    <p className="text-sm text-red-500">Couldn&apos;t load this product: {error}</p>
                    <Link
                        href="/products"
                        className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/85"
                    >
                        Back to shop
                    </Link>
                </section>
            </>
        );
    }

    if (!product) {
        return (
            <>
                <Navbar />
                <section className="container-page py-24 text-center">
                    <p className="text-sm text-ink/50">We couldn&apos;t find that product.</p>
                    <Link
                        href="/products"
                        className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/85"
                    >
                        Back to shop
                    </Link>
                </section>
            </>
        );
    }

    const sameCategory = allProducts.filter((p) => p.id !== product.id && p.category === product.category);
    const recommendations = (
        sameCategory.length > 0 ? sameCategory : allProducts.filter((p) => p.id !== product.id)
    ).slice(0, 4);

    return (
        <>
            <Navbar />
            <section className="container-page py-12">
                <Link href="/products" className="flex items-center gap-1 text-sm text-ink/60 hover:text-ink">
                    <ArrowLeft size={14} />
                    Back to shop
                </Link>

                <div className="mt-6 grid gap-10 md:grid-cols-2">
                    <div className="aspect-square w-full overflow-hidden rounded-2xl bg-ink/5">
                        {product.image_url ? (
                            <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-ink/30">
                                No image
                            </div>
                        )}
                    </div>

                    <div>
                        <span className="text-xs uppercase tracking-wide text-muted">{product.category}</span>
                        <h1 className="mt-2 font-display text-3xl font-semibold">{product.name}</h1>
                        <p className="mt-4 text-sm leading-relaxed text-ink/70">{product.description}</p>

                        <div className="mt-6 flex items-center gap-3">
                            <span className="text-2xl font-semibold">${product.price.toFixed(2)}</span>
                            <span className={`text-xs ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {product.stock > 0 ? 'In stock' : 'Sold out'}
                            </span>
                        </div>

                        <AddToCartPanel product={product} />
                    </div>
                </div>

                {recommendations.length > 0 && (
                    <div className="mt-20">
                        <Reveal className="mb-6">
                            <h2 className="font-display text-2xl font-semibold">You may also like</h2>
                        </Reveal>
                        <RevealContainer className="grid grid-cols-2 gap-6 md:grid-cols-4">
                            {recommendations.map((p) => (
                                <RevealItem key={p.id}>
                                    <ProductCard product={p} />
                                </RevealItem>
                            ))}
                        </RevealContainer>
                    </div>
                )}
            </section>
        </>
    );
}
