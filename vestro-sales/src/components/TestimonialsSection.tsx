'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Reveal } from '@/src/components/Reveal';

const testimonials = [
    {
        quote: 'The USB-C hub is the first one I haven\'t had to return.',
        author: 'Marta, Lisbon',
        rating: 5,
    },
    {
        quote: 'Understated, well made, and it just works.',
        author: 'Diego, Porto',
        rating: 5,
    },
    {
        quote: 'My whole desk setup finally feels intentional.',
        author: 'Aiko, Tokyo',
        rating: 5,
    },
];

export default function TestimonialsSection() {
    return (
        <section className="container-page py-24">
            <Reveal className="mb-12">
                <h2 className="font-display text-3xl font-semibold">Loved by creators</h2>
                <p className="mt-2 text-sm text-ink/60">Join thousands of professionals who've upgraded their workspace.</p>
            </Reveal>

            <div className="grid gap-6 md:grid-cols-3">
                {testimonials.map((testimonial, index) => (
                    <Reveal key={testimonial.author} delay={index * 0.1}>
                        <motion.div
                            className="rounded-2xl border border-black/5 bg-white p-6 transition hover:border-black/10 hover:shadow-md"
                            whileHover={{ y: -4 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <div className="mb-4 flex gap-1">
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
                                    <Star key={i} size={14} className="fill-ink text-ink" />
                                ))}
                            </div>
                            <p className="text-sm text-ink/70">"{testimonial.quote}"</p>
                            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">{testimonial.author}</p>
                        </motion.div>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}
