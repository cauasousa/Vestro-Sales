'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send } from 'lucide-react';
import { chatApi, type Conversation } from '@/src/lib/api';

const replies = [
    "Thanks for reaching out — let me check that for you.",
    "Good question! I'll follow up shortly with details.",
    "Got it, I'm looking into your order now.",
];

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
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

                setConversations(list);
                setSelectedId(preselectCustomer ?? loaded[0]?.customerId ?? null);
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load conversations'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const active = conversations.find((c) => c.customerId === selectedId) ?? null;

    const upsertConversation = (updated: Conversation) => {
        setConversations((prev) => {
            const exists = prev.some((c) => c.customerId === updated.customerId);
            return exists
                ? prev.map((c) => (c.customerId === updated.customerId ? updated : c))
                : [...prev, updated];
        });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId || !draft.trim()) return;

        const text = draft.trim();
        setDraft('');

        try {
            upsertConversation(await chatApi.sendMessage(selectedId, text, 'admin'));

            setTimeout(async () => {
                const reply = replies[Math.floor(Math.random() * replies.length)];
                try {
                    upsertConversation(await chatApi.sendMessage(selectedId, reply, 'customer'));
                } catch {
                    // best-effort simulated reply; ignore failures
                }
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] max-w-6xl gap-6">
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
                        return (
                            <button
                                key={c.customerId}
                                onClick={() => setSelectedId(c.customerId)}
                                className={`block w-full border-b border-black/5 px-4 py-3 text-left transition ${isActive ? 'bg-ink/5' : 'hover:bg-ink/[0.02]'
                                    }`}
                            >
                                <p className="text-sm font-medium">{c.customerName}</p>
                                <p className="mt-0.5 truncate text-xs text-ink/50">{last?.text ?? 'No messages yet'}</p>
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
                        <div className="border-b border-black/5 px-6 py-4">
                            <h2 className="font-display text-base font-semibold">{active.customerName}</h2>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
                            {active.messages.map((m) => (
                                <div key={m.id} className={`flex ${m.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
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
