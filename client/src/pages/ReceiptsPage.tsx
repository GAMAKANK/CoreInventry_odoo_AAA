import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receiptApi, productApi, locationApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal, PageLoader, EmptyState, Pagination, StatusFilter, StatusBadge, ConfirmDialog, ErrorMsg, Spinner } from '../components/ui';
import { useDocumentActions } from '../hooks/useDocumentActions';
import { Plus, ArrowDownToLine, CheckCircle, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Product { id: string; sku: string; name: string; unit: string; }
interface Location { id: string; code: string; name: string; warehouse: { name: string }; }
interface ReceiptLine { productId: string; locationId: string; quantity: number; unitCost?: number; }

function ReceiptForm({ products, locations, onSave, onCancel, loading, error }: {
  products: Product[]; locations: Location[];
  onSave: (d: object) => void; onCancel: () => void; loading: boolean; error: string;
}) {
  const [supplierName, setSupplier] = useState('');
  const [notes, setNotes]           = useState('');
  const [lines, setLines]           = useState<ReceiptLine[]>([{ productId: '', locationId: '', quantity: 1 }]);

  const addLine    = () => setLines(l => [...l, { productId: '', locationId: '', quantity: 1 }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const setLine    = (i: number, k: string, v: unknown) =>
    setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [k]: v } : ln));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ supplierName, notes, lines }); }} className="space-y-5">
      {error && <ErrorMsg message={error} />}
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Supplier Name</label><input className="input" value={supplierName} onChange={e => setSupplier(e.target.value)} /></div>
        <div><label className="label">Notes</label><input className="input" value={notes} onChange={e => setNotes(e.target.value)} /></div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Line Items *</label>
          <button type="button" className="btn-ghost btn-sm" onClick={addLine}><Plus className="w-3 h-3" /> Add Line</button>
        </div>
        <div className="space-y-2">
          {lines.map((ln, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <select className="input" value={ln.productId} onChange={e => setLine(i, 'productId', e.target.value)} required>
                  <option value="">Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                </select>
              </div>
              <div className="col-span-4">
                <select className="input" value={ln.locationId} onChange={e => setLine(i, 'locationId', e.target.value)} required>
                  <option value="">Location</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse.name} · {l.code}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input type="number" className="input" min={1} placeholder="Qty" value={ln.quantity} onChange={e => setLine(i, 'quantity', parseInt(e.target.value))} required />
              </div>
              <div className="col-span-1">
                <input type="number" className="input" min={0} step="0.01" placeholder="Cost" value={ln.unitCost || ''} onChange={e => setLine(i, 'unitCost', parseFloat(e.target.value))} />
              </div>
              <div className="col-span-1 text-center">
                {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1">Columns: Product · Location · Qty · Unit Cost</p>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading && <Spinner size="sm" />} Create Receipt</button>
      </div>
    </form>
  );
}

export default function ReceiptsPage() {
  const qc = useQueryClient();
  const { isManager } = useAuth();
  const [page, setPage]   = useState(1);
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [formErr, setFE]  = useState('');
  const [confirm, setConfirm] = useState<{ type: 'confirm' | 'cancel'; id: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['receipts', page, status],
    queryFn:  () => receiptApi.list({ page, limit: 20, status: status || undefined }).then(r => r.data.data),
  });
  const { data: products = [] } = useQuery({ queryKey: ['products-all'], queryFn: () => productApi.list({ limit: 500 }).then(r => r.data.data.products) });
  const { data: locations = [] } = useQuery({ queryKey: ['locations-all'], queryFn: () => locationApi.list().then(r => r.data.data) });

  const createMut = useMutation({
    mutationFn: (d: object) => receiptApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['receipts'] }); setModal(false); setFE(''); },
    onError: (e: unknown) => setFE((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'),
  });

  const { confirm: confirmMut, cancel: cancelMut } = useDocumentActions('receipts');

  const receipts = data?.receipts || [];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><ArrowDownToLine className="w-5 h-5" /> Receipts</h1><p className="page-subtitle">Goods-in documents — incoming stock</p></div>
        <button className="btn-primary" onClick={() => { setFE(''); setModal(true); }}><Plus className="w-4 h-4" /> New Receipt</button>
      </div>

      <div className="card p-4 mb-4 flex gap-3">
        <StatusFilter value={status} onChange={v => { setStatus(v); setPage(1); }} />
      </div>

      <div className="card">
        {isLoading ? <PageLoader /> : receipts.length === 0 ? <EmptyState message="No receipts found" /> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Document #</th><th>Supplier</th><th>Lines</th><th>Status</th><th>Created</th>{isManager && <th className="text-right">Actions</th>}</tr></thead>
              <tbody>
                {receipts.map((r: { id: string; documentNumber: string; supplierName?: string; lines: unknown[]; status: string; createdAt: string; }) => (
                  <tr key={r.id}>
                    <td><span className="font-mono text-xs font-medium text-brand-700">{r.documentNumber}</span></td>
                    <td>{r.supplierName || '—'}</td>
                    <td>{r.lines.length} line(s)</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="text-slate-400 text-xs">{format(new Date(r.createdAt), 'dd MMM yyyy')}</td>
                    {isManager && (
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.status === 'DRAFT' && <>
                            <button className="btn-ghost btn-sm text-emerald-600" onClick={() => setConfirm({ type: 'confirm', id: r.id })} title="Confirm"><CheckCircle className="w-4 h-4" /></button>
                            <button className="btn-ghost btn-sm text-red-400"     onClick={() => setConfirm({ type: 'cancel',  id: r.id })} title="Cancel"><XCircle className="w-4 h-4" /></button>
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

      <Modal open={modal} onClose={() => setModal(false)} title="New Receipt" size="xl">
        <ReceiptForm products={products} locations={locations} onSave={d => createMut.mutate(d)} onCancel={() => setModal(false)} loading={createMut.isPending} error={formErr} />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { if (confirm?.type === 'confirm') confirmMut.mutate(confirm.id); else cancelMut.mutate(confirm!.id); setConfirm(null); }}
        title={confirm?.type === 'confirm' ? 'Confirm Receipt' : 'Cancel Receipt'}
        message={confirm?.type === 'confirm' ? 'This will increase stock at the specified locations. This action cannot be undone.' : 'Are you sure you want to cancel this receipt?'}
        confirmLabel={confirm?.type === 'confirm' ? 'Confirm & Post' : 'Cancel Receipt'}
        danger={confirm?.type === 'cancel'}
        loading={confirmMut.isPending || cancelMut.isPending}
      />
    </div>
  );
}
