'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/src/components/Navbar';
import { useAuth } from '@/src/hooks/useAuth';

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptsMarketing, setAcceptsMarketing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<'signed-in' | 'needs-confirmation' | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await register(fullName, email, password, acceptsMarketing);
            setLoading(false);

            if (result.session) {
                setSuccess('signed-in');
                setTimeout(() => router.push('/products'), 1000);
            } else {
                setSuccess('needs-confirmation');
            }
        } catch (err) {
            setLoading(false);
            setError(err instanceof Error ? err.message : 'Registration failed');
        }
    };

    return (
        <>
            <Navbar />
            <section className="container-page flex min-h-[70vh] items-center justify-center py-16">
                <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-8">
                    <h1 className="font-display text-2xl font-semibold">Create your account</h1>
                    <p className="mt-1 text-sm text-ink/60">Join the store as a customer.</p>

                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-ink/60">Full name</label>
                            <input
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-ink/60">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-ink/60">Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                            />
                        </div>
                    </div>

                    <label className="mt-4 flex items-start gap-2.5 text-sm text-ink/70">
                        <input
                            type="checkbox"
                            checked={acceptsMarketing}
                            onChange={(e) => setAcceptsMarketing(e.target.checked)}
                            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-black/20"
                        />
                        Would you like to receive updates and event notifications by email?
                    </label>

                    {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
                    {success === 'signed-in' && (
                        <p className="mt-4 text-sm text-emerald-600">Account created! Redirecting…</p>
                    )}
                    {success === 'needs-confirmation' && (
                        <p className="mt-4 text-sm text-emerald-600">
                            Account created! Check your email to confirm it, then sign in.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-6 w-full rounded-full bg-ink px-4 py-3 text-sm font-medium text-paper transition hover:bg-ink/85 disabled:opacity-50"
                    >
                        {loading ? 'Creating account…' : 'Create account'}
                    </button>

                    <p className="mt-4 text-center text-sm text-ink/60">
                        Already have an account?{' '}
                        <Link href="/login" className="font-medium text-ink">
                            Sign in
                        </Link>
                    </p>
                </form>
            </section>
        </>
    );
}
