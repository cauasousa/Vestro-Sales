'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { createProduct, deleteProduct, getProducts, updateProduct } from '@/src/lib/product-data';
import type { Product } from '@/src/lib/types';

const emptyForm = {
    name: '',
    description: '',
    category: 'accessories',
    price: '',
    stock: '',
    image_url: '',
};

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);

    const loadProducts = async () => {
        setLoading(true);
        const data = await getProducts();
        setProducts([...data].sort((a, b) => b.created_at.localeCompare(a.created_at)));
        setLoading(false);
    };

    useEffect(() => {
        loadProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setShowForm(true);
    };

    const openEdit = (p: Product) => {
        setEditingId(p.id);
        setForm({
            name: p.name,
            description: p.description || '',
            category: p.category,
            price: String(p.price),
            stock: String(p.stock),
            image_url: p.image_url || '',
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            name: form.name,
            description: form.description,
            category: form.category as Product['category'],
            price: Number(form.price),
            stock: Number(form.stock),
            image_url: form.image_url,
        };

        if (editingId) {
            updateProduct(editingId, payload);
        } else {
            createProduct(payload);
        }

        setShowForm(false);
        loadProducts();
    };

    const handleDelete = (id: string) => {
        if (!confirm('Delete this product?')) return;
        deleteProduct(id);
        loadProducts();
    };

    return (
        <div className="max-w-6xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-semibold">Products</h1>
                    <p className="mt-1 text-sm text-ink/60">Manage your catalog.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/85"
                >
                    <Plus size={16} />
                    New product
                </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-black/5 bg-ink/[0.02] text-xs uppercase tracking-wide text-ink/50">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Price</th>
                            <th className="px-4 py-3">Stock</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-ink/50">
                                    Loading products…
                                </td>
                            </tr>
                        ) : products.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-ink/50">
                                    No products yet.
                                </td>
                            </tr>
                        ) : (
                            products.map((p) => (
                                <tr key={p.id} className="border-t border-black/5">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{p.name}</div>
                                    </td>
                                    <td className="px-4 py-3 text-ink/60">{p.category}</td>
                                    <td className="px-4 py-3">${p.price.toFixed(2)}</td>
                                    <td className="px-4 py-3">{p.stock}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openEdit(p)}
                                                className="rounded-lg border border-black/10 p-2 hover:bg-black/5"
                                                aria-label={`Edit ${p.name}`}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-500 hover:bg-red-100"
                                                aria-label={`Delete ${p.name}`}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
                    <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-display text-xl font-semibold">
                                {editingId ? 'Edit product' : 'New product'}
                            </h2>
                            <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 hover:bg-black/5">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-ink/60">Name</label>
                                <input
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-ink/60">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-ink/60">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                    >
                                        <option value="accessories">Accessories</option>
                                        <option value="audio">Audio</option>
                                        <option value="desk">Desk</option>
                                        <option value="work">Work</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-ink/60">Stock</label>
                                    <input
                                        type="number"
                                        min={0}
                                        required
                                        value={form.stock}
                                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-ink/60">Price</label>
                                <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    required
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-ink/60">Image URL</label>
                                <input
                                    value={form.image_url}
                                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-accent"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-black/10 px-4 py-2 text-sm">
                                Cancel
                            </button>
                            <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper">
                                {editingId ? 'Save changes' : 'Create product'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
