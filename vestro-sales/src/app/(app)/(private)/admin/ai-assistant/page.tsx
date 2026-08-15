'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send } from 'lucide-react';
import { api } from '@/src/lib/api';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    text: string;
};

const suggestions = [
    "What's this week's revenue?",
    "What's my top product?",
    'Any products low on stock?',
    'How many new customers this week?',
];

export default function AiAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);

    const ask = async (prompt: string) => {
        if (!prompt.trim() || thinking) return;

        const userMessage: Message = { id: `u-${Date.now()}`, role: 'user', text: prompt.trim() };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setThinking(true);

        let answer: string;
        try {
            const res = await api.askAssistant(prompt.trim());
            answer = res.answer;
        } catch (err) {
            answer = err instanceof Error ? `Sorry, something went wrong: ${err.message}` : 'Sorry, something went wrong.';
        }

        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: answer }]);
        setThinking(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        ask(input);
    };

    return (
        <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col">
            <div className="flex items-center gap-2 pb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-paper">
                    <Sparkles size={16} />
                </span>
                <div>
                    <h1 className="font-display text-lg font-semibold">AI Assistant</h1>
                    <p className="text-xs text-ink/50">Ask about revenue, products, and customers.</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-2xl border border-black/5 bg-white p-6">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5">
                            <Sparkles size={20} className="text-muted" />
                        </span>
                        <div>
                            <p className="text-sm font-medium">Ask me anything about your store</p>
                            <p className="mt-1 text-xs text-ink/50">Try one of these to get started</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => ask(s)}
                                    className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-ink/70 transition hover:border-black/30"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence initial={false}>
                            {messages.map((m) => (
                                <motion.div
                                    key={m.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {m.role === 'assistant' && (
                                        <span className="mr-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ink/5">
                                            <Sparkles size={12} className="text-muted" />
                                        </span>
                                    )}
                                    <div
                                        className={`max-w-md whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-ink text-paper' : 'border border-black/5 bg-paper text-ink'
                                            }`}
                                    >
                                        {m.text}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {thinking && (
                            <div className="flex items-center gap-2 pl-9">
                                <span className="flex gap-1">
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30 [animation-delay:-0.3s]" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30 [animation-delay:-0.15s]" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30" />
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your store…"
                    className="flex-1 rounded-full border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-accent"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || thinking}
                    aria-label="Send"
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:bg-ink/85 disabled:opacity-40"
                >
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
}
