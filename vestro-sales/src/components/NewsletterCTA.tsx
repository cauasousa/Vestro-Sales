'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Reveal } from '@/src/components/Reveal';
import { Mail, ArrowRight } from 'lucide-react';

export default function NewsletterCTA() {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            setSubscribed(true);
            setEmail('');
            setTimeout(() => setSubscribed(false), 3000);
        }
    };

    return (
        <section className="border-t border-black/5 bg-ink py-24">
            <div className="container-page max-w-2xl">
                <Reveal>
                    <motion.div
                        className="text-center text-paper"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="font-display text-3xl font-semibold">Join the club</h2>
                        <p className="mt-2 text-paper/70">Get 10% off your first order and the latest drops delivered to your inbox.</p>

                        <form onSubmit={handleSubscribe} className="mt-8 flex gap-3">
                            <div className="relative flex-1">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/50" />
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-full border border-paper/20 bg-paper/10 px-4 py-3 pl-12 text-sm text-paper placeholder-paper/50 outline-none focus:border-paper/40"
                                    required
                                />
                            </div>
                            <motion.button
                                type="submit"
                                className="flex items-center gap-2 rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition hover:bg-paper/90"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {subscribed ? 'Subscribed!' : (
                                    <>
                                        Subscribe <ArrowRight size={14} />
                                    </>
                                )}
                            </motion.button>
                        </form>
                    </motion.div>
                </Reveal>
            </div>
        </section>
    );
}
