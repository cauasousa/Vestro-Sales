import type { User, UserCreateInput } from '@/src/types';

export function isUser(value: unknown): value is User {
    if (!value || typeof value !== 'object') return false;

    const item = value as Record<string, unknown>;

    return (
        typeof item.id === 'string' &&
        typeof item.full_name === 'string' &&
        typeof item.email === 'string' &&
        typeof item.password === 'string' &&
        (item.role === 'manager' || item.role === 'client')
    );
}

export function validateUsers(value: unknown): value is User[] {
    return Array.isArray(value) && value.every((item) => isUser(item));
}

export function normalizeUserCreate(input: Partial<UserCreateInput>): UserCreateInput {
    return {
        full_name: String(input.full_name ?? ''),
        email: String(input.email ?? ''),
        password: String(input.password ?? ''),
        role: input.role === 'manager' ? 'manager' : 'client',
    };
}
