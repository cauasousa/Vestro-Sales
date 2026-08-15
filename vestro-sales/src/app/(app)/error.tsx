'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function AppError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                <AlertTriangle size={22} />
            </span>
            <div>
                <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
                <p className="mt-2 max-w-sm text-sm text-ink/60">
                    We hit an unexpected error loading this page. You can try again, or head back home.
                </p>
            </div>
            <div className="mt-2 flex gap-3">
                <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/85"
                >
                    <RotateCw size={14} />
                    Try again
                </button>
                <Link
                    href="/"
                    className="rounded-full border border-black/10 px-5 py-2.5 text-sm text-ink/70 transition hover:border-black/30"
                >
                    Go home
                </Link>
            </div>
        </div>
    );
}
