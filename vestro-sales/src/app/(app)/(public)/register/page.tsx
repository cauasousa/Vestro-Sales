'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/src/components/Navbar';
import { useAuthMock } from '@/src/hooks/useAuthMock';
import { createUser } from '@/src/lib/user-store';

export default function RegisterPage() {
    const router = useRouter();
    const { login } = useAuthMock();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            createUser({ full_name: fullName, email, password, role: 'client' });
            login(email, password);
        } catch (err) {
            setLoading(false);
            setError(err instanceof Error ? err.message : 'Registration failed');
            return;
        }

        setLoading(false);
        setSuccess(true);
        setTimeout(() => router.push('/products'), 1000);
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

                    {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
                    {success && <p className="mt-4 text-sm text-emerald-600">Account created! Redirecting…</p>}

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
