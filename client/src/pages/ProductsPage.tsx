import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi, categoryApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal, PageLoader, EmptyState, Pagination, SearchInput, ErrorMsg, Spinner } from '../components/ui';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';

interface Product {
  id: string; sku: string; name: string; description?: string;
  unit: string; reorderLevel: number; isActive: boolean;
  category: { id: string; name: string };
}

interface Category { id: string; name: string; }

function ProductForm({ initial, categories, onSave, onCancel, loading, error }: {
  initial?: Partial<Product>;
  categories: Category[];
  onSave: (data: object) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  const [form, setForm] = useState({
    sku: initial?.sku || '',
    name: initial?.name || '',
    description: initial?.description || '',
    unit: initial?.unit || 'pcs',
    reorderLevel: initial?.reorderLevel ?? 10,
    categoryId: initial?.category?.id || '',
  });
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      {error && <ErrorMsg message={error} />}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">SKU *</label>
          <input className="input font-mono" value={form.sku} onChange={e => set('sku', e.target.value)} required disabled={!!initial?.sku} />
        </div>
        <div>
          <label className="label">Unit</label>
          <select className="input" value={form.unit} onChange={e => set('unit', e.target.value)}>
            {['pcs','kg','liters','meters','boxes','ream','rolls'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Name *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Category *</label>
          <select className="input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Reorder Level</label>
          <input type="number" className="input" min={0} value={form.reorderLevel} onChange={e => set('reorderLevel', parseInt(e.target.value))} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Spinner size="sm" /> : null}
          {initial?.id ? 'Update' : 'Create'} Product
        </button>
      </div>
    </form>
  );
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const { isManager } = useAuth();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCat] = useState('');
  const [modal, setModal]   = useState<{ open: boolean; product?: Product }>({ open: false });
  const [formError, setFE]  = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, catFilter],
    queryFn:  () => productApi.list({ page, limit: 20, search: search || undefined, categoryId: catFilter || undefined }).then(r => r.data.data),
  });

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoryApi.list().then(r => r.data.data),
  });

  const save = useMutation({
    mutationFn: (d: object) => modal.product
      ? productApi.update(modal.product!.id, d)
      : productApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setModal({ open: false }); setFE(''); },
    onError: (e: unknown) => setFE((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error saving product'),
  });

  const del = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const products: Product[] = data?.products || [];
  const categories: Category[] = catData || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Package className="w-5 h-5" /> Products</h1>
          <p className="page-subtitle">Manage your product catalogue</p>
        </div>
        {isManager && (
          <button className="btn-primary" onClick={() => { setFE(''); setModal({ open: true }); }}>
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex gap-3 flex-wrap">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search SKU or name..." />
        <select className="input w-auto" value={catFilter} onChange={e => { setCat(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card">
        {isLoading ? <PageLoader /> : products.length === 0 ? <EmptyState message="No products found" /> : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th><th>Name</th><th>Category</th><th>Unit</th><th>Reorder Level</th>
                  {isManager && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{p.sku}</span></td>
                    <td className="font-medium text-slate-900">{p.name}</td>
                    <td>{p.category?.name}</td>
                    <td>{p.unit}</td>
                    <td>{p.reorderLevel}</td>
                    {isManager && (
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button className="btn-ghost btn-sm" onClick={() => { setFE(''); setModal({ open: true, product: p }); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => del.mutate(p.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
        </div>
      </div>

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.product ? 'Edit Product' : 'Add Product'}
      >
        <ProductForm
          initial={modal.product}
          categories={categories}
          onSave={d => save.mutate(d)}
          onCancel={() => setModal({ open: false })}
          loading={save.isPending}
          error={formError}
        />
      </Modal>
    </div>
  );
}
