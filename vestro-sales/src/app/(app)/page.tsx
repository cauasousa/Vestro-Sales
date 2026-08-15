'use client';

import Link from 'next/link';
import Navbar from '@/src/components/Navbar';
import HeroSection from '@/src/components/HeroSection';
import ProductCard from '@/src/components/ProductCard';
import TrustBar from '@/src/components/TrustBar';
import TestimonialsSection from '@/src/components/TestimonialsSection';
import NewsletterCTA from '@/src/components/NewsletterCTA';
import { Reveal, RevealContainer, RevealItem } from '@/src/components/Reveal';
import { useProducts } from '@/src/hooks/useProducts';

export default function LandingPage() {
    const { products } = useProducts({ featured: true });

    return (
        <>
            <Navbar />
            <HeroSection imageUrl="/images/hero_image.jpeg" imageAlt="Vestro hero image" />

            {/* Trust Bar */}
            <TrustBar />

            {/* Featured Products */}
            <section id="featured" className="container-page py-24">
                <Reveal className="mb-8">
                    <div className="flex items-end justify-between">
                        <h2 className="font-display text-3xl font-semibold">Featured</h2>
                        <Link href="/products" className="text-sm text-ink/60 hover:text-ink">
                            View all products →
                        </Link>
                    </div>
                </Reveal>

                {products.length === 0 ? (
                    <Reveal>
                        <p className="text-sm text-ink/50">No products yet — add some from the admin dashboard.</p>
                    </Reveal>
                ) : (
                    <RevealContainer className="grid grid-cols-2 gap-6 md:grid-cols-4">
                        {products.map((p) => (
                            <RevealItem key={p.id}>
                                <ProductCard product={p} />
                            </RevealItem>
                        ))}
                    </RevealContainer>
                )}
            </section>

            {/* Testimonials */}
            <TestimonialsSection />

            {/* Newsletter CTA */}
            <NewsletterCTA />

            {/* Footer */}
            <footer className="container-page py-10 text-xs text-muted text-center">
                © {new Date().getFullYear()} Vestro. Built as a portfolio project.
            </footer>
        </>
    );
}
