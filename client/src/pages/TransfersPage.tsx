import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transferApi, productApi, locationApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal, PageLoader, EmptyState, Pagination, StatusFilter, StatusBadge, ConfirmDialog, ErrorMsg, Spinner } from '../components/ui';
import { useDocumentActions } from '../hooks/useDocumentActions';
import { Plus, ArrowLeftRight, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Product { id: string; sku: string; name: string; }
interface Location { id: string; code: string; name: string; warehouse: { name: string }; }

function TransferForm({ products, locations, onSave, onCancel, loading, error }: {
  products: Product[]; locations: Location[];
  onSave: (d: object) => void; onCancel: () => void; loading: boolean; error: string;
}) {
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ productId: '', fromLocationId: '', toLocationId: '', quantity: 1 }]);

  const addLine    = () => setLines(l => [...l, { productId: '', fromLocationId: '', toLocationId: '', quantity: 1 }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const setLine    = (i: number, k: string, v: unknown) => setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [k]: v } : ln));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ notes, lines }); }} className="space-y-5">
      {error && <ErrorMsg message={error} />}
      <div><label className="label">Notes</label><input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for transfer..." /></div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Transfer Lines *</label>
          <button type="button" className="btn-ghost btn-sm" onClick={addLine}><Plus className="w-3 h-3" /> Add Line</button>
        </div>
        <div className="space-y-3">
          {lines.map((ln, i) => (
            <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="grid grid-cols-4 gap-2">
                <div><label className="label text-xs">Product</label><select className="input" value={ln.productId} onChange={e => setLine(i, 'productId', e.target.value)} required><option value="">Select...</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></div>
                <div><label className="label text-xs">From Location</label><select className="input" value={ln.fromLocationId} onChange={e => setLine(i, 'fromLocationId', e.target.value)} required><option value="">Select...</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse.name} · {l.code}</option>)}</select></div>
                <div><label className="label text-xs">To Location</label><select className="input" value={ln.toLocationId} onChange={e => setLine(i, 'toLocationId', e.target.value)} required><option value="">Select...</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse.name} · {l.code}</option>)}</select></div>
                <div className="flex gap-2">
                  <div className="flex-1"><label className="label text-xs">Qty</label><input type="number" className="input" min={1} value={ln.quantity} onChange={e => setLine(i, 'quantity', parseInt(e.target.value))} required /></div>
                  {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 mt-6 text-lg">×</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading && <Spinner size="sm" />} Create Transfer</button>
      </div>
    </form>
  );
}

export default function TransfersPage() {
  const qc = useQueryClient();
  const { isManager } = useAuth();
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');
  const [modal, setModal]   = useState(false);
  const [formErr, setFE]    = useState('');
  const [confirm, setConfirm] = useState<{ type: 'confirm' | 'cancel'; id: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', page, status],
    queryFn:  () => transferApi.list({ page, limit: 20, status: status || undefined }).then(r => r.data.data),
  });
  const { data: products = [] }  = useQuery({ queryKey: ['products-all'],  queryFn: () => productApi.list({ limit: 500 }).then(r => r.data.data.products) });
  const { data: locations = [] } = useQuery({ queryKey: ['locations-all'], queryFn: () => locationApi.list().then(r => r.data.data) });

  const createMut = useMutation({
    mutationFn: (d: object) => transferApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfers'] }); setModal(false); setFE(''); },
    onError: (e: unknown) => setFE((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'),
  });

  const { confirm: confirmMut, cancel: cancelMut } = useDocumentActions('transfers');
  const transfers = data?.transfers || [];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><ArrowLeftRight className="w-5 h-5" /> Internal Transfers</h1><p className="page-subtitle">Move stock between locations or warehouses</p></div>
        <button className="btn-primary" onClick={() => { setFE(''); setModal(true); }}><Plus className="w-4 h-4" /> New Transfer</button>
      </div>

      <div className="card p-4 mb-4"><StatusFilter value={status} onChange={v => { setStatus(v); setPage(1); }} /></div>

      <div className="card">
        {isLoading ? <PageLoader /> : transfers.length === 0 ? <EmptyState message="No transfers found" /> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Document #</th><th>Lines</th><th>Status</th><th>Created</th>{isManager && <th className="text-right">Actions</th>}</tr></thead>
              <tbody>
                {transfers.map((t: { id: string; documentNumber: string; lines: unknown[]; status: string; createdAt: string; notes?: string; }) => (
                  <tr key={t.id}>
                    <td><span className="font-mono text-xs font-medium text-brand-700">{t.documentNumber}</span></td>
                    <td>{t.lines.length} line(s){t.notes && <span className="text-slate-400 ml-2 text-xs">· {t.notes}</span>}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-slate-400 text-xs">{format(new Date(t.createdAt), 'dd MMM yyyy')}</td>
                    {isManager && (
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {t.status === 'DRAFT' && <>
                            <button className="btn-ghost btn-sm text-emerald-600" onClick={() => setConfirm({ type: 'confirm', id: t.id })}><CheckCircle className="w-4 h-4" /></button>
                            <button className="btn-ghost btn-sm text-red-400"     onClick={() => setConfirm({ type: 'cancel',  id: t.id })}><XCircle className="w-4 h-4" /></button>
                          </>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4"><Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} /></div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Internal Transfer" size="xl">
        <TransferForm products={products} locations={locations} onSave={d => createMut.mutate(d)} onCancel={() => setModal(false)} loading={createMut.isPending} error={formErr} />
      </Modal>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => { if (confirm?.type === 'confirm') confirmMut.mutate(confirm.id); else cancelMut.mutate(confirm!.id); setConfirm(null); }}
        title={confirm?.type === 'confirm' ? 'Confirm Transfer' : 'Cancel Transfer'}
        message={confirm?.type === 'confirm' ? 'Stock will be moved from source to destination locations. Stock availability will be validated.' : 'Cancel this transfer?'}
        confirmLabel={confirm?.type === 'confirm' ? 'Confirm & Move' : 'Cancel Transfer'}
        danger={confirm?.type === 'cancel'}
        loading={confirmMut.isPending || cancelMut.isPending}
      />
    </div>
  );
}
