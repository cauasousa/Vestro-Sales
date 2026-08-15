'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, ShoppingBag, ShoppingCart, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useCart } from '@/src/hooks/useCart';
import { useAuthMock } from '@/src/hooks/useAuthMock';

const links = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Shop' },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { itemCount } = useCart();
    const { user, isManager, logout } = useAuthMock();

    const handleSignOut = () => {
        logout();
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
                    {isManager && (
                        <Link
                            href="/admin"
                            className="flex items-center gap-1.5 text-sm text-ink/70 transition hover:text-ink"
                        >
                            <LayoutDashboard size={15} />
                            Admin
                        </Link>
                    )}

                    <Link href="/cart" className="relative text-ink/70 transition hover:text-ink" aria-label="Cart">
                        <ShoppingCart size={20} />
                        {itemCount > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-paper">
                                {itemCount}
                            </span>
                        )}
                    </Link>

                    {user ? (
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-sm text-ink/70">
                                <User size={15} />
                                {user.full_name?.split(' ')[0] || user.email}
                            </span>
                            <button
                                type="button"
                                onClick={handleSignOut}
                                aria-label="Sign out"
                                className="text-ink/50 transition hover:text-ink"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <Link href="/login" className="text-sm text-ink/70 transition hover:text-ink">
                            Sign in
                        </Link>
                    )}

                    <Link
                        href="/products"
                        className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/85"
                    >
                        <ShoppingBag size={16} />
                        Shop now
                    </Link>
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

                        {isManager && (
                            <Link href="/admin" className="text-sm" onClick={() => setOpen(false)}>
                                Admin dashboard
                            </Link>
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
