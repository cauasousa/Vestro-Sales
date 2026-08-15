'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import Navbar from '@/src/components/Navbar';
import { useAuth } from '@/src/hooks/useAuth';
import { chatApi, type Conversation } from '@/src/lib/api';

export default function SupportPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !draft.trim()) return;

        const text = draft.trim();
        setDraft('');
        setSending(true);

        try {
            setConversation(await chatApi.sendMessage(user.id, text, 'customer'));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
            setSending(false);
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
                <div className="pb-4">
                    <h1 className="font-display text-2xl font-semibold">Contact us</h1>
                    <p className="mt-1 text-sm text-ink/60">
                        Questions about an order or a product? Send us a message and we'll get back to you.
                    </p>
                </div>

                {error && <p className="pb-4 text-sm text-red-500">{error}</p>}

                <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white">
                    <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
                        {loading ? (
                            <p className="text-sm text-ink/50">Loading…</p>
                        ) : conversation && conversation.messages.length > 0 ? (
                            conversation.messages.map((m) => (
                                <div key={m.id} className={`flex ${m.from === 'customer' ? 'justify-end' : 'justify-start'}`}>
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
