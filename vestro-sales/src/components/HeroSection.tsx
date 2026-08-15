'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

type HeroSectionProps = {
    imageUrl?: string;
    imageAlt?: string;
};

export default function HeroSection({ imageUrl, imageAlt }: HeroSectionProps) {
    return (
        <section className="container-page grid gap-12 py-24 md:grid-cols-2 md:items-center">
            <div className="flex flex-col items-start gap-6">
                <motion.span
                    className="rounded-full border border-black/10 px-3 py-1 text-xs uppercase tracking-widest text-muted"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    New arrivals every month
                </motion.span>

                <motion.h1
                    className="max-w-2xl font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    Home gear for people who care about the details.
                </motion.h1>

                <motion.p
                    className="max-w-lg text-base text-ink/60"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    Minimalist tech accessories, designed to disappear into your workflow — not your desk.
                </motion.p>

                <motion.div
                    className="flex gap-4 pt-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Link
                            href="/products"
                            className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition hover:bg-ink/85"
                        >
                            Browse the shop
                        </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Link
                            href="#featured"
                            className="rounded-full border border-black/10 px-6 py-3 text-sm font-medium transition hover:border-black/30"
                        >
                            See what's new
                        </Link>
                    </motion.div>
                </motion.div>
            </div>

            <motion.div
                className="aspect-square w-full overflow-hidden rounded-2xl bg-ink/5"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
            >
                {imageUrl ? (
                    <img src={imageUrl} alt={imageAlt ?? ''} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-ink/30">
                        No image
                    </div>
                )}
            </motion.div>
        </section>
    );
}
