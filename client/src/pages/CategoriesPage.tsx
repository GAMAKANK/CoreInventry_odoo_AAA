// CategoriesPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal, PageLoader, EmptyState, ErrorMsg, Spinner } from '../components/ui';
import { Plus, Tag } from 'lucide-react';

interface Category { id: string; name: string; description?: string; }

export function CategoriesPage() {
  const qc = useQueryClient();
  const { isManager } = useAuth();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm]  = useState({ name: '', description: '' });
  const [err, setErr]    = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoryApi.list().then(r => r.data.data),
  });

  const save = useMutation({
    mutationFn: (d: object) => editing ? categoryApi.update(editing.id, d) : categoryApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setModal(false); setErr(''); },
    onError: (e: unknown) => setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'),
  });

  function openCreate() { setEditing(null); setForm({ name: '', description: '' }); setErr(''); setModal(true); }
  function openEdit(c: Category) { setEditing(c); setForm({ name: c.name, description: c.description || '' }); setErr(''); setModal(true); }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Tag className="w-5 h-5" /> Categories</h1>
          <p className="page-subtitle">Organise products into categories</p>
        </div>
        {isManager && <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" /> Add Category</button>}
      </div>
      <div className="card">
        {isLoading ? <PageLoader /> : data.length === 0 ? <EmptyState /> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Description</th>{isManager && <th className="text-right">Actions</th>}</tr></thead>
              <tbody>
                {data.map((c: Category) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td className="text-slate-500">{c.description || '—'}</td>
                    {isManager && (
                      <td className="text-right">
                        <button className="btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
          {err && <ErrorMsg message={err} />}
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><label className="label">Description</label><input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={save.isPending}>{save.isPending && <Spinner size="sm" />} Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default CategoriesPage;
