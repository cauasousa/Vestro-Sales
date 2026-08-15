'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { Product } from '@/src/lib/types';

export default function ProductCard({ product }: { product: Product }) {
    return (
        <Link href={`/products/${product.id}`}>
            <motion.div
                className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white transition"
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 300 }}
            >
                <div className="aspect-square w-full overflow-hidden bg-ink/5 relative">
                    {product.image_url ? (
                        <motion.img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.5 }}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-ink/30">
                            No image
                        </div>
                    )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                    <span className="text-xs uppercase tracking-wide text-muted">{product.category}</span>
                    <h3 className="font-display text-base font-semibold">{product.name}</h3>
                    <div className="mt-auto flex items-center justify-between pt-3">
                        <span className="text-lg font-semibold">${product.price.toFixed(2)}</span>
                        <span className={`text-xs ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {product.stock > 0 ? 'In stock' : 'Sold out'}
                        </span>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
