'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Flag, Package, Send } from 'lucide-react';
import { chatApi, type Conversation } from '@/src/lib/api';
import { supabase, syncSupabaseSession } from '@/src/lib/supabase-client';

export default function AdminChatPage() {
    return (
        <Suspense fallback={null}>
            <AdminChatContent />
        </Suspense>
    );
}

function AdminChatContent() {
    const searchParams = useSearchParams();
    const preselectCustomer = searchParams.get('customer');

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
    const [customerOnline, setCustomerOnline] = useState(false);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const selectedIdRef = useRef<string | null>(null);
    selectedIdRef.current = selectedId;
    const conversationsRef = useRef<Conversation[]>([]);
    conversationsRef.current = conversations;

    const active = conversations.find((c) => c.customerId === selectedId) ?? null;

    useEffect(() => {
        chatApi
            .conversations()
            .then(async (loaded) => {
                let list = loaded;

                // Arrived here via "Message client" on an order for a customer
                // with no message history yet — that conversation won't be in
                // the list, so fetch (and create) it on demand.
                if (preselectCustomer && !loaded.some((c) => c.customerId === preselectCustomer)) {
                    try {
                        const conversation = await chatApi.conversation(preselectCustomer);
                        list = [conversation, ...loaded];
                    } catch {
                        // customer doesn't exist or isn't reachable — fall through silently
                    }
                }

                setConversations(sortByRecent(list));
                setSelectedId(preselectCustomer ?? loaded[0]?.customerId ?? null);
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load conversations'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Live updates across every conversation — admin RLS allows reading all
    // chat_messages rows, so a single subscription covers the whole inbox.
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;
        let cancelled = false;

        syncSupabaseSession().then((ok) => {
            if (!ok || cancelled) return;

            channel = supabase
                .channel('admin-chat')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                    (payload) => {
                        const row = payload.new as {
                            id: string;
                            conversation_id: string;
                            sender: 'admin' | 'customer';
                            text: string;
                            order_id: string | null;
                            created_at: string;
                        };

                        // Flag as unread only when it's a customer message landing on a
                        // conversation the admin isn't currently looking at.
                        const match = conversationsRef.current.find((c) => c.id === row.conversation_id);
                        if (match && row.sender === 'customer' && match.customerId !== selectedIdRef.current) {
                            setUnreadIds((ids) => {
                                if (ids.has(match.customerId)) return ids;
                                const next = new Set(ids);
                                next.add(match.customerId);
                                return next;
                            });
                        }

                        setConversations((prev) =>
                            sortByRecent(
                                prev.map((c) =>
                                    c.id === row.conversation_id && !c.messages.some((m) => m.id === row.id)
                                        ? {
                                              ...c,
                                              messages: [
                                                  ...c.messages,
                                                  { id: row.id, from: row.sender, text: row.text, orderId: row.order_id, createdAt: row.created_at },
                                              ],
                                          }
                                        : c
                                )
                            )
                        );
                    }
                )
                .subscribe();
        });

        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    // Presence for the open thread only — joining every conversation's presence
    // channel just to light up a dot in the sidebar isn't worth N extra sockets,
    // so this only tracks whether the currently-open customer is online.
    useEffect(() => {
        if (!active?.id) {
            setCustomerOnline(false);
            return;
        }

        let channel: ReturnType<typeof supabase.channel> | null = null;
        let cancelled = false;
        const conversationId = active.id;

        syncSupabaseSession().then((ok) => {
            if (!ok || cancelled) return;

            channel = supabase
                .channel(`chat:${conversationId}`)
                .on('presence', { event: 'sync' }, () => {
                    const state = channel!.presenceState<{ role: 'admin' | 'customer' }>();
                    const roles = Object.values(state).flat().map((p) => p.role);
                    setCustomerOnline(roles.includes('customer'));
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel!.track({ role: 'admin' });
                    }
                });
        });

        return () => {
            cancelled = true;
            setCustomerOnline(false);
            if (channel) supabase.removeChannel(channel);
        };
    }, [active?.id]);

    const lastActivity = (c: Conversation) => c.messages[c.messages.length - 1]?.createdAt ?? '';

    const sortByRecent = (list: Conversation[]) =>
        [...list].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));

    const upsertConversation = (updated: Conversation) => {
        setConversations((prev) => {
            const exists = prev.some((c) => c.customerId === updated.customerId);
            const next = exists
                ? prev.map((c) => (c.customerId === updated.customerId ? updated : c))
                : [...prev, updated];
            return sortByRecent(next);
        });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId || !draft.trim()) return;

        const text = draft.trim();
        setDraft('');

        try {
            upsertConversation(await chatApi.sendMessage(selectedId, text, 'admin'));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        }
    };

    return (
        <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl gap-6">
            <div className="w-72 flex-shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-white">
                <div className="border-b border-black/5 px-4 py-3">
                    <h1 className="font-display text-lg font-semibold">Support chat</h1>
                    <p className="text-xs text-ink/50">
                        {loading ? 'Loading…' : `${conversations.length} conversations`}
                    </p>
                </div>
                <div className="overflow-y-auto">
                    {conversations.map((c) => {
                        const last = c.messages[c.messages.length - 1];
                        const isActive = c.customerId === selectedId;
                        const isUnread = unreadIds.has(c.customerId);
                        return (
                            <button
                                key={c.customerId}
                                onClick={() => {
                                    setSelectedId(c.customerId);
                                    setUnreadIds((ids) => {
                                        if (!ids.has(c.customerId)) return ids;
                                        const next = new Set(ids);
                                        next.delete(c.customerId);
                                        return next;
                                    });
                                }}
                                className={`block w-full border-b border-black/5 px-4 py-3 text-left transition ${isActive ? 'bg-ink/5' : 'hover:bg-ink/[0.02]'
                                    }`}
                            >
                                <div className="flex items-center gap-1.5">
                                    {isUnread && (
                                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" aria-label="New message" />
                                    )}
                                    <p className={`text-sm ${isUnread ? 'font-semibold text-ink' : 'font-medium'}`}>
                                        {c.customerName}
                                    </p>
                                    {c.reported && (
                                        <span className="flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                                            <Flag size={9} />
                                            Reported
                                        </span>
                                    )}
                                </div>
                                <p className={`mt-0.5 truncate text-xs ${isUnread ? 'font-medium text-ink/80' : 'text-ink/50'}`}>
                                    {last?.text ?? 'No messages yet'}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white">
                {error && <p className="px-6 pt-4 text-sm text-red-500">{error}</p>}
                {!active ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-ink/50">
                        {loading ? 'Loading conversations…' : 'Select a conversation to start replying.'}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 border-b border-black/5 px-6 py-4">
                            <h2 className="font-display text-base font-semibold">{active.customerName}</h2>
                            {customerOnline && (
                                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Online
                                </span>
                            )}
                            {active.reported && (
                                <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                    <Flag size={11} />
                                    Reported
                                </span>
                            )}
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
                            {active.messages.map((m) => (
                                <div key={m.id} className={`flex flex-col ${m.from === 'admin' ? 'items-end' : 'items-start'}`}>
                                    {m.orderId && (
                                        <Link
                                            href={`/admin/orders?order=${m.orderId}`}
                                            className="mb-1 flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent/20"
                                        >
                                            <Package size={10} />
                                            Order #{m.orderId.slice(0, 8)}
                                        </Link>
                                    )}
                                    <div
                                        className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${m.from === 'admin' ? 'bg-ink text-paper' : 'bg-black/5 text-ink'
                                            }`}
                                    >
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSend} className="flex items-center gap-3 border-t border-black/5 p-4">
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder="Type a reply…"
                                className="flex-1 rounded-full border border-black/10 px-4 py-2 text-sm outline-none focus:border-accent"
                            />
                            <button
                                type="submit"
                                disabled={!draft.trim()}
                                aria-label="Send message"
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:bg-ink/85 disabled:opacity-40"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
