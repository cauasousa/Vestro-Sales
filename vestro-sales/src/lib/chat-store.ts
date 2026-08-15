import { getUsers } from '@/src/lib/user-store';

const STORAGE_KEY = 'vestro_chat';

export type ChatMessage = {
    id: string;
    from: 'admin' | 'customer';
    text: string;
    createdAt: string;
};

export type Conversation = {
    customerId: string;
    customerName: string;
    messages: ChatMessage[];
};

const canned = [
    'Hi! I have a question about my order.',
    'Does this come in other colors?',
    'When will my order ship?',
];

function seedConversations(): Conversation[] {
    const clients = getUsers().filter((u) => u.role === 'client');
    const names = clients.length > 0 ? clients.map((c) => ({ id: c.id, name: c.full_name || c.email })) : [
        { id: 'demo-customer-1', name: 'Alex Rivera' },
        { id: 'demo-customer-2', name: 'Jamie Chen' },
    ];

    return names.slice(0, 3).map((customer, i) => ({
        customerId: customer.id,
        customerName: customer.name,
        messages: [
            {
                id: `seed-${customer.id}`,
                from: 'customer' as const,
                text: canned[i % canned.length],
                createdAt: new Date(Date.now() - (i + 1) * 3600_000).toISOString(),
            },
        ],
    }));
}

function readConversations(): Conversation[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        const seeded = seedConversations();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
    }

    try {
        return JSON.parse(stored) as Conversation[];
    } catch {
        return [];
    }
}

function writeConversations(conversations: Conversation[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function getConversations(): Conversation[] {
    return readConversations();
}

export function sendMessage(customerId: string, text: string, from: ChatMessage['from'] = 'admin'): Conversation[] {
    const conversations = readConversations();
    const message: ChatMessage = {
        id: `msg-${Date.now().toString(36)}-${from}`,
        from,
        text,
        createdAt: new Date().toISOString(),
    };

    const next = conversations.map((c) =>
        c.customerId === customerId ? { ...c, messages: [...c.messages, message] } : c
    );

    writeConversations(next);
    return next;
}
