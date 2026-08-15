import Link from 'next/link';
import { Compass } from 'lucide-react';
import Navbar from '@/src/components/Navbar';

export default function NotFound() {
    return (
        <>
            <Navbar />
            <section className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink/40">
                    <Compass size={22} />
                </span>
                <div>
                    <h1 className="font-display text-xl font-semibold">Page not found</h1>
                    <p className="mt-2 max-w-sm text-sm text-ink/60">
                        The page you're looking for doesn't exist or may have moved.
                    </p>
                </div>
                <Link
                    href="/"
                    className="mt-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/85"
                >
                    Go home
                </Link>
            </section>
        </>
    );
}
