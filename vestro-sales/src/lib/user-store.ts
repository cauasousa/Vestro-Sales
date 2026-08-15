import type { User, UserCreateInput } from '@/src/types';

const STORAGE_KEY = 'vestro_users';

const seedUsers: User[] = [
    {
        id: 'manager-001',
        full_name: 'Admin Vestro',
        email: 'admin@vestro.com',
        password: 'admin123',
        role: 'manager',
    },
];

export function getUsers(): User[] {
    if (typeof window === 'undefined') return seedUsers;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seedUsers));
        return seedUsers;
    }

    try {
        return JSON.parse(stored) as User[];
    } catch {
        return seedUsers;
    }
}

function saveUsers(users: User[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export function findUserByEmail(email: string): User | null {
    return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function createUser(input: UserCreateInput): User {
    if (findUserByEmail(input.email)) {
        throw new Error('An account with this email already exists');
    }

    const user: User = { ...input, id: `user-${Date.now().toString(36)}` };
    saveUsers([...getUsers(), user]);
    return user;
}
