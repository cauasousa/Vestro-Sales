'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/src/components/Sidebar';
import { useAuth } from '@/src/hooks/useAuth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, isLoading, isAdmin } = useAuth();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push('/login');
                return;
            }

            if (!isAdmin) {
                router.push('/products');
                return;
            }

            setChecked(true);
        }
    }, [isLoading, user, isAdmin, router]);

    if (!checked) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-ink/50">
                Checking access…
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-paper">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
    );
}
