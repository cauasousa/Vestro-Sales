'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/src/components/Sidebar';
import { useAuthMock } from '@/src/hooks/useAuthMock';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, isLoading, isManager } = useAuthMock();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push('/login');
                return;
            }

            if (!isManager) {
                router.push('/products');
                return;
            }

            setChecked(true);
        }
    }, [isLoading, user, isManager, router]);

    if (!checked) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-ink/50">
                Checking access…
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-paper">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
    );
}
