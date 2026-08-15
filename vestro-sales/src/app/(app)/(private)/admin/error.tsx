'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

// admin/layout.tsx (Sidebar + shell) stays mounted around this boundary, so
// this only needs to fill the <main> content area, not rebuild the whole page.
export default function AdminError({
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
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                <AlertTriangle size={22} />
            </span>
            <div>
                <h1 className="font-display text-xl font-semibold">Couldn't load this page</h1>
                <p className="mt-2 max-w-sm text-sm text-ink/60">
                    Something went wrong fetching data for this section.
                </p>
            </div>
            <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/85"
            >
                <RotateCw size={14} />
                Try again
            </button>
        </div>
    );
}
