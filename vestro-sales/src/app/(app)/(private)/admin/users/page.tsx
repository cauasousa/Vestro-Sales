'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { usersApi } from '@/src/lib/api';
import type { Profile, Role } from '@/src/lib/types';

const emptyForm = {
    full_name: '',
    email: '',
    password: '',
    role: 'customer' as Role,
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        try {
            setUsers(await usersApi.list());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const openCreate = () => {
        setForm(emptyForm);
        setError(null);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            await usersApi.create(form);
            setShowForm(false);
            await loadUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create user');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-semibold">Users</h1>
                    <p className="mt-1 text-sm text-ink/60">Manage customers and admins.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/85"
                >
                    <Plus size={16} />
                    New user
                </button>
            </div>

            {error && !showForm && <p className="mt-4 text-sm text-red-500">{error}</p>}

            <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white">
                <div className="scroll-thin max-h-[520px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-ink/50">
                            <tr>
                                <th className="sticky top-0 z-10 border-b border-black/10 bg-[#F1F0ED] px-4 py-3">
                                    Name
                                </th>
                                <th className="sticky top-0 z-10 border-b border-black/10 bg-[#F1F0ED] px-4 py-3">
                                    Email
                                </th>
                                <th className="sticky top-0 z-10 border-b border-black/10 bg-[#F1F0ED] px-4 py-3">
                                    Role
                                </th>
                                <th className="sticky top-0 z-10 border-b border-black/10 bg-[#F1F0ED] px-4 py-3">
                                    Joined
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-ink/50">
                                        Loading users…
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-ink/50">
                                        No users yet.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id} className="border-t border-black/5">
                                        <td className="px-4 py-3 font-medium">{u.full_name || '—'}</td>
                                        <td className="px-4 py-3 text-ink/60">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs capitalize ${u.role === 'admin'
                                                    ? 'bg-ink text-paper'
                                                    : 'bg-black/5 text-ink/70'
                                                    }`}
                                            >
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-ink/50">
                                            {new Date(u.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
                    <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-display text-xl font-semibold">New user</h2>
                            <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 hover:bg-black/5">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-ink/60">Full name</label>
                                <input
                                    required
                                    value={form.full_name}
                                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-ink/60">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-ink/60">Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-ink/60">Role</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                >
                                    <option value="customer">Customer</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-black/10 px-4 py-2 text-sm">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
                            >
                                {saving ? 'Creating…' : 'Create user'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
