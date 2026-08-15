'use client';

import { motion } from 'framer-motion';
import { Shield, Truck, Lock } from 'lucide-react';

const trustItems = [
    { icon: Truck, label: 'Free shipping', desc: 'On orders over $50' },
    { icon: Shield, label: '1-year warranty', desc: 'Covered by warranty' },
    { icon: Lock, label: 'Secure checkout', desc: 'SSL encrypted' },
];

export default function TrustBar() {
    return (
        <section className="border-y border-black/5 bg-paper py-8">
            <div className="container-page">
                <div className="grid grid-cols-3 gap-8">
                    {trustItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <motion.div
                                key={item.label}
                                className="flex items-center gap-3"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Icon size={20} className="text-ink" />
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-ink">{item.label}</p>
                                    <p className="text-xs text-ink/50">{item.desc}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
