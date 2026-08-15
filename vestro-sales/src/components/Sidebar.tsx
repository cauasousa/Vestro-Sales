'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, Users, MessagesSquare, Sparkles, Store, LogOut, ArrowLeft } from 'lucide-react';
import { useAuthMock } from '@/src/hooks/useAuthMock';

const items = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/chat', label: 'Support chat', icon: MessagesSquare },
    { href: '/admin/ai-assistant', label: 'AI assistant', icon: Sparkles },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuthMock();

    const handleSignOut = () => {
        logout();
        router.push('/login');
    };

    return (
        <aside className="flex h-screen w-64 flex-col border-r border-black/5 bg-white">
            <Link href="/" className="flex h-16 items-center gap-2 border-b border-black/5 px-6">
                <Store size={18} />
                <span className="font-display text-sm font-semibold">Vestro Admin</span>
            </Link>

            <div className="px-3 pt-4">
                <Link
                    href="/"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink/70 transition hover:bg-ink/5"
                >
                    <ArrowLeft size={16} />
                    Back to store
                </Link>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-ink/5'
                                }`}
                        >
                            <Icon size={16} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-black/5 p-3">
                <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink/70 transition hover:bg-ink/5"
                >
                    <LogOut size={16} />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
