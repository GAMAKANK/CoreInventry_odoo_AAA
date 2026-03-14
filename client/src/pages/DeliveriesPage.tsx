import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryApi, productApi, locationApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal, PageLoader, EmptyState, Pagination, StatusFilter, StatusBadge, ConfirmDialog, ErrorMsg, Spinner } from '../components/ui';
import { useDocumentActions } from '../hooks/useDocumentActions';
import { Plus, ArrowUpFromLine, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Product { id: string; sku: string; name: string; }
interface Location { id: string; code: string; name: string; warehouse: { name: string }; }

function DeliveryForm({ products, locations, onSave, onCancel, loading, error }: {
  products: Product[]; locations: Location[];
  onSave: (d: object) => void; onCancel: () => void; loading: boolean; error: string;
}) {
  const [customerName, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ productId: '', locationId: '', quantity: 1, unitPrice: '' }]);

  const addLine    = () => setLines(l => [...l, { productId: '', locationId: '', quantity: 1, unitPrice: '' }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const setLine    = (i: number, k: string, v: unknown) => setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [k]: v } : ln));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ customerName, notes, lines }); }} className="space-y-5">
      {error && <ErrorMsg message={error} />}
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Customer Name</label><input className="input" value={customerName} onChange={e => setCustomer(e.target.value)} /></div>
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
              <div className="col-span-4"><select className="input" value={ln.productId} onChange={e => setLine(i, 'productId', e.target.value)} required><option value="">Product</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></div>
              <div className="col-span-4"><select className="input" value={ln.locationId} onChange={e => setLine(i, 'locationId', e.target.value)} required><option value="">Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse.name} · {l.code}</option>)}</select></div>
              <div className="col-span-2"><input type="number" className="input" min={1} placeholder="Qty" value={ln.quantity} onChange={e => setLine(i, 'quantity', parseInt(e.target.value))} required /></div>
              <div className="col-span-1"><input type="number" className="input" min={0} step="0.01" placeholder="Price" value={ln.unitPrice} onChange={e => setLine(i, 'unitPrice', e.target.value)} /></div>
              <div className="col-span-1 text-center">{lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-lg">×</button>}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1">Note: Stock availability is validated on confirmation.</p>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading && <Spinner size="sm" />} Create Delivery</button>
      </div>
    </form>
  );
}

export default function DeliveriesPage() {
  const qc = useQueryClient();
  const { isManager } = useAuth();
  const [page, setPage]   = useState(1);
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [formErr, setFE]  = useState('');
  const [confirm, setConfirm] = useState<{ type: 'confirm' | 'cancel'; id: string } | null>(null);
  const [actionErr, setAE] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', page, status],
    queryFn:  () => deliveryApi.list({ page, limit: 20, status: status || undefined }).then(r => r.data.data),
  });
  const { data: products = [] } = useQuery({ queryKey: ['products-all'], queryFn: () => productApi.list({ limit: 500 }).then(r => r.data.data.products) });
  const { data: locations = [] } = useQuery({ queryKey: ['locations-all'], queryFn: () => locationApi.list().then(r => r.data.data) });

  const createMut = useMutation({
    mutationFn: (d: object) => deliveryApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliveries'] }); setModal(false); setFE(''); },
    onError: (e: unknown) => setFE((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'),
  });

  const { confirm: confirmMut, cancel: cancelMut } = useDocumentActions('deliveries');

  const deliveries = data?.deliveries || [];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><ArrowUpFromLine className="w-5 h-5" /> Delivery Orders</h1><p className="page-subtitle">Goods-out documents — outgoing stock</p></div>
        <button className="btn-primary" onClick={() => { setFE(''); setModal(true); }}><Plus className="w-4 h-4" /> New Delivery</button>
      </div>

      <div className="card p-4 mb-4 flex gap-3">
        <StatusFilter value={status} onChange={v => { setStatus(v); setPage(1); }} />
      </div>

      <div className="card">
        {isLoading ? <PageLoader /> : deliveries.length === 0 ? <EmptyState message="No deliveries found" /> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Document #</th><th>Customer</th><th>Lines</th><th>Status</th><th>Created</th>{isManager && <th className="text-right">Actions</th>}</tr></thead>
              <tbody>
                {deliveries.map((d: { id: string; documentNumber: string; customerName?: string; lines: unknown[]; status: string; createdAt: string; }) => (
                  <tr key={d.id}>
                    <td><span className="font-mono text-xs font-medium text-brand-700">{d.documentNumber}</span></td>
                    <td>{d.customerName || '—'}</td>
                    <td>{d.lines.length} line(s)</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="text-slate-400 text-xs">{format(new Date(d.createdAt), 'dd MMM yyyy')}</td>
                    {isManager && (
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {d.status === 'DRAFT' && <>
                            <button className="btn-ghost btn-sm text-emerald-600" onClick={() => { setAE(''); setConfirm({ type: 'confirm', id: d.id }); }} title="Confirm"><CheckCircle className="w-4 h-4" /></button>
                            <button className="btn-ghost btn-sm text-red-400"     onClick={() => setConfirm({ type: 'cancel',  id: d.id })} title="Cancel"><XCircle className="w-4 h-4" /></button>
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

      <Modal open={modal} onClose={() => setModal(false)} title="New Delivery Order" size="xl">
        <DeliveryForm products={products} locations={locations} onSave={d => createMut.mutate(d)} onCancel={() => setModal(false)} loading={createMut.isPending} error={formErr} />
      </Modal>

      {actionErr && <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg shadow">{actionErr}</div>}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          try {
            if (confirm?.type === 'confirm') await confirmMut.mutateAsync(confirm.id);
            else await cancelMut.mutateAsync(confirm!.id);
            setConfirm(null);
          } catch (e: unknown) {
            setAE((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed');
            setConfirm(null);
          }
        }}
        title={confirm?.type === 'confirm' ? 'Confirm Delivery' : 'Cancel Delivery'}
        message={confirm?.type === 'confirm' ? 'This will deduct stock from the specified locations. Stock availability will be validated.' : 'Are you sure you want to cancel this delivery order?'}
        confirmLabel={confirm?.type === 'confirm' ? 'Confirm & Ship' : 'Cancel Delivery'}
        danger={confirm?.type === 'cancel'}
        loading={confirmMut.isPending || cancelMut.isPending}
      />
    </div>
  );
}
