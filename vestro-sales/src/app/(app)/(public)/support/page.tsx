'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Flag, Package, Send, X } from 'lucide-react';
import Navbar from '@/src/components/Navbar';
import { useAuth } from '@/src/hooks/useAuth';
import { chatApi, type Conversation } from '@/src/lib/api';
import { supabase, syncSupabaseSession } from '@/src/lib/supabase-client';

export default function SupportPage() {
    return (
        <Suspense fallback={null}>
            <SupportContent />
        </Suspense>
    );
}

function SupportContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [draft, setDraft] = useState('');
    const [orderContext, setOrderContext] = useState<string | null>(() => searchParams.get('order'));
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportSent, setReportSent] = useState(false);
    const [adminOnline, setAdminOnline] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;

        chatApi
            .conversation(user.id)
            .then(setConversation)
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load conversation'))
            .finally(() => setLoading(false));
    }, [user]);

    // Live updates: an admin reply lands here without a refresh, as long as this
    // screen is open. RLS scopes the subscription to this customer's own messages.
    // The same channel also carries presence — tracking ourselves as 'customer' and
    // watching for an 'admin' entry drives the "Admin online" indicator below.
    useEffect(() => {
        if (!user || !conversation?.id) return;

        let channel: ReturnType<typeof supabase.channel> | null = null;
        let cancelled = false;

        syncSupabaseSession().then((ok) => {
            if (!ok || cancelled) return;

            channel = supabase
                .channel(`chat:${conversation.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'chat_messages',
                        filter: `conversation_id=eq.${conversation.id}`,
                    },
                    (payload) => {
                        const row = payload.new as {
                            id: string;
                            sender: 'admin' | 'customer';
                            text: string;
                            order_id: string | null;
                            created_at: string;
                        };
                        setConversation((current) => {
                            if (!current) return current;
                            if (current.messages.some((m) => m.id === row.id)) return current;
                            return {
                                ...current,
                                messages: [
                                    ...current.messages,
                                    { id: row.id, from: row.sender, text: row.text, orderId: row.order_id, createdAt: row.created_at },
                                ],
                            };
                        });
                    }
                )
                .on('presence', { event: 'sync' }, () => {
                    const state = channel!.presenceState<{ role: 'admin' | 'customer' }>();
                    const roles = Object.values(state).flat().map((p) => p.role);
                    setAdminOnline(roles.includes('admin'));
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel!.track({ role: 'customer' });
                    }
                });
        });

        return () => {
            cancelled = true;
            setAdminOnline(false);
            if (channel) supabase.removeChannel(channel);
        };
    }, [user, conversation?.id]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !draft.trim()) return;

        const text = draft.trim();
        setDraft('');
        setSending(true);

        try {
            setConversation(await chatApi.sendMessage(user.id, text, 'customer', orderContext));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            await chatApi.report(user.id, reportReason.trim() || undefined);
            setReportSent(true);
            setReportOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send report');
        }
    };

    if (authLoading || !user) {
        return (
            <>
                <Navbar />
                <section className="container-page py-24 text-center text-sm text-ink/50">Loading…</section>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <section className="container-page flex h-[calc(100vh-4rem)] flex-col py-8">
                <div className="flex items-start justify-between gap-4 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-display text-2xl font-semibold">Contact us</h1>
                            {adminOnline && (
                                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Admin online
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-ink/60">
                            Questions about an order or a product? Send us a message and we'll get back to you.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setReportOpen((v) => !v)}
                        disabled={reportSent}
                        className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-2 text-xs font-medium text-ink/60 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Flag size={13} />
                        {reportSent ? 'Reported' : 'Report'}
                    </button>
                </div>

                {reportOpen && (
                    <form
                        onSubmit={handleReport}
                        className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-4"
                    >
                        <div className="flex-1 min-w-[220px]">
                            <label className="text-xs font-medium text-ink/60">
                                What's wrong with this conversation? (optional)
                            </label>
                            <input
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                placeholder="Tell us what happened…"
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                        >
                            Submit report
                        </button>
                    </form>
                )}

                {error && <p className="pb-4 text-sm text-red-500">{error}</p>}

                <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white">
                    <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
                        {loading ? (
                            <p className="text-sm text-ink/50">Loading…</p>
                        ) : conversation && conversation.messages.length > 0 ? (
                            conversation.messages.map((m) => (
                                <div key={m.id} className={`flex flex-col ${m.from === 'customer' ? 'items-end' : 'items-start'}`}>
                                    {m.orderId && (
                                        <Link
                                            href={`/orders?highlight=${m.orderId}`}
                                            className="mb-1 flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent/20"
                                        >
                                            <Package size={10} />
                                            Order #{m.orderId.slice(0, 8)}
                                        </Link>
                                    )}
                                    <div
                                        className={`max-w-sm rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.from === 'customer' ? 'bg-ink text-paper' : 'bg-black/5 text-ink'
                                            }`}
                                    >
                                        {m.text}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-ink/50">
                                Send a message to start the conversation.
                            </div>
                        )}
                    </div>

                    {orderContext && (
                        <div className="flex items-center justify-between gap-3 border-t border-black/5 bg-accent/5 px-4 py-2">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
                                <Package size={13} />
                                Regarding order #{orderContext.slice(0, 8)}
                            </span>
                            <button
                                type="button"
                                onClick={() => setOrderContext(null)}
                                aria-label="Clear order context"
                                className="text-accent/60 hover:text-accent"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSend} className="flex items-center gap-3 border-t border-black/5 p-4">
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Type a message…"
                            className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-accent"
                        />
                        <button
                            type="submit"
                            disabled={!draft.trim() || sending}
                            aria-label="Send message"
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:bg-ink/85 disabled:opacity-40"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </section>
        </>
    );
}
