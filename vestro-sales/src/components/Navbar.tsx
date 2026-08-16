'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ShoppingCart, ChevronDown, Package, MessageCircle, LogOut } from 'lucide-react';
import { useCart } from '@/src/hooks/useCart';
import { useAuth } from '@/src/hooks/useAuth';

const links = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Shop' },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { itemCount } = useCart();
    const { user, isAdmin, logout } = useAuth();

    const handleSignOut = async () => {
        await logout();
        setOpen(false);
        router.push('/');
    };

    return (
        <header className="sticky top-0 z-40 border-b border-black/5 bg-paper/80 backdrop-blur-md">
            <div className="container-page flex h-16 items-center justify-between">
                <Link href="/" className="font-display text-lg font-semibold tracking-tight">
                    Vestro
                </Link>

                <nav className="hidden gap-8 md:flex">
                    {links.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="text-sm text-ink/70 transition hover:text-ink"
                        >
                            {l.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden items-center gap-4 md:flex">
                    <Link href="/cart" className="relative text-ink/70 transition hover:text-ink" aria-label="Cart">
                        <ShoppingCart size={20} />
                        {itemCount > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-paper">
                                {itemCount}
                            </span>
                        )}
                    </Link>

                    {user ? (
                        <AccountMenu
                            label={isAdmin ? 'Admin' : 'Account'}
                            labelHref={isAdmin ? '/admin' : undefined}
                            onSignOut={handleSignOut}
                        />
                    ) : (
                        <Link href="/login" className="text-sm text-ink/70 transition hover:text-ink">
                            Sign in
                        </Link>
                    )}
                </div>

                <div className="flex items-center gap-4 md:hidden">
                    <Link href="/cart" className="relative text-ink/70" aria-label="Cart">
                        <ShoppingCart size={20} />
                        {itemCount > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-paper">
                                {itemCount}
                            </span>
                        )}
                    </Link>
                    <button
                        aria-label="Toggle menu"
                        onClick={() => setOpen((v) => !v)}
                    >
                        {open ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {open && (
                <div className="border-t border-black/5 bg-paper md:hidden">
                    <div className="container-page flex flex-col gap-4 py-4">
                        {links.map((l) => (
                            <Link key={l.href} href={l.href} className="text-sm" onClick={() => setOpen(false)}>
                                {l.label}
                            </Link>
                        ))}

                        {isAdmin && (
                            <Link href="/admin" className="text-sm" onClick={() => setOpen(false)}>
                                Admin dashboard
                            </Link>
                        )}

                        {user && (
                            <>
                                <Link href="/orders" className="text-sm" onClick={() => setOpen(false)}>
                                    Your orders
                                </Link>
                                <Link href="/support" className="text-sm" onClick={() => setOpen(false)}>
                                    Contact seller
                                </Link>
                            </>
                        )}

                        {user ? (
                            <>
                                <span className="text-sm text-ink/50">
                                    Signed in as {user.full_name || user.email}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleSignOut}
                                    className="text-left text-sm text-ink/70"
                                >
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <Link href="/login" className="text-sm" onClick={() => setOpen(false)}>
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}

function AccountMenu({
    label,
    labelHref,
    onSignOut,
}: {
    label: string;
    labelHref?: string;
    onSignOut: () => void;
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    return (
        <div ref={containerRef} className="relative inline-block">
            <div className="inline-flex items-center overflow-hidden rounded-full border border-black/10 bg-paper">
                {labelHref ? (
                    <Link
                        href={labelHref}
                        className="px-3.5 py-2 text-sm font-medium text-ink/70 transition hover:bg-black/5 hover:text-ink"
                    >
                        {label}
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="px-3.5 py-2 text-sm font-medium text-ink/70 transition hover:bg-black/5 hover:text-ink"
                    >
                        {label}
                    </button>
                )}

                <motion.button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Toggle account menu"
                    aria-expanded={open}
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`flex items-center border-l border-black/10 px-2.5 py-2 text-ink/60 transition-colors hover:bg-black/5 hover:text-ink ${open ? 'bg-black/5' : ''
                        }`}
                >
                    <ChevronDown size={14} />
                </motion.button>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={{ top: 'calc(100% + 1px)' }}
                        className="absolute right-0 z-[999] w-44 overflow-hidden rounded-xl border border-black/5 bg-white py-1.5 shadow-lg"
                    >
                        <Link
                            href="/orders"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink/70 transition hover:bg-black/5 hover:text-ink"
                        >
                            <Package size={15} />
                            Orders
                        </Link>

                        <Link
                            href="/support"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink/70 transition hover:bg-black/5 hover:text-ink"
                        >
                            <MessageCircle size={15} />
                            Contact seller
                        </Link>

                        <div className="my-1 border-t border-black/5" />

                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                onSignOut();
                            }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-ink/70 transition hover:bg-black/5 hover:text-ink"
                        >
                            <LogOut size={15} />
                            Logout
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
