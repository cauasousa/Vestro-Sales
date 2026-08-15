'use client';

import { useEffect } from 'react';

// Last-resort fallback — only fires if the root layout itself throws (fonts,
// providers, etc). It replaces <html>/<body> entirely, so it can't rely on
// Tailwind/globals.css having loaded and uses inline styles instead.
export default function GlobalError({
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
        <html lang="en">
            <body
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    padding: 24,
                    textAlign: 'center',
                    fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    background: '#F6F5F2',
                    color: '#0B0D10',
                }}
            >
                <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
                <p style={{ fontSize: 14, color: '#8A8F98', maxWidth: 360, margin: 0 }}>
                    The app hit an unexpected error. Try reloading the page.
                </p>
                <button
                    type="button"
                    onClick={reset}
                    style={{
                        borderRadius: 999,
                        padding: '10px 22px',
                        background: '#0B0D10',
                        color: '#F6F5F2',
                        border: 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                    }}
                >
                    Try again
                </button>
            </body>
        </html>
    );
}
