import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adjustmentApi, productApi, locationApi, stockApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal, PageLoader, EmptyState, Pagination, StatusFilter, StatusBadge, ConfirmDialog, ErrorMsg, Spinner } from '../components/ui';
import { useDocumentActions } from '../hooks/useDocumentActions';
import { Plus, SlidersHorizontal, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const REASONS = ['CYCLE_COUNT', 'DAMAGED', 'EXPIRED', 'FOUND', 'SYSTEM_CORRECTION'];

interface Product { id: string; sku: string; name: string; }
interface Location { id: string; code: string; name: string; warehouse: { name: string }; }
interface StockLevel { productId: string; locationId: string; quantity: number; }

function AdjustmentForm({ products, locations, stockLevels, onSave, onCancel, loading, error }: {
  products: Product[]; locations: Location[]; stockLevels: StockLevel[];
  onSave: (d: object) => void; onCancel: () => void; loading: boolean; error: string;
}) {
  const [reason, setReason] = useState('CYCLE_COUNT');
  const [notes, setNotes]   = useState('');
  const [lines, setLines]   = useState([{ productId: '', locationId: '', quantityAfter: 0 }]);

  const getCurrentQty = (productId: string, locationId: string) => {
    const s = stockLevels.find(s => s.productId === productId && s.locationId === locationId);
    return s?.quantity ?? 0;
  };

  const addLine    = () => setLines(l => [...l, { productId: '', locationId: '', quantityAfter: 0 }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const setLine    = (i: number, k: string, v: unknown) => setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [k]: v } : ln));

  const buildPayload = () => ({
    reason, notes,
    lines: lines.map(ln => {
      const qBefore = getCurrentQty(ln.productId, ln.locationId);
      return {
        productId:      ln.productId,
        locationId:     ln.locationId,
        quantityBefore: qBefore,
        quantityAfter:  Number(ln.quantityAfter),
        delta:          Number(ln.quantityAfter) - qBefore,
      };
    }),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(buildPayload()); }} className="space-y-5">
      {error && <ErrorMsg message={error} />}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Reason *</label>
          <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
            {REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div><label className="label">Notes</label><input className="input" value={notes} onChange={e => setNotes(e.target.value)} /></div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Adjustment Lines *</label>
          <button type="button" className="btn-ghost btn-sm" onClick={addLine}><Plus className="w-3 h-3" /> Add Line</button>
        </div>
        <div className="space-y-2">
          {lines.map((ln, i) => {
            const currentQty = getCurrentQty(ln.productId, ln.locationId);
            const delta = Number(ln.quantityAfter) - currentQty;
            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4"><select className="input" value={ln.productId} onChange={e => setLine(i, 'productId', e.target.value)} required><option value="">Product</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></div>
                <div className="col-span-3"><select className="input" value={ln.locationId} onChange={e => setLine(i, 'locationId', e.target.value)} required><option value="">Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse.name} · {l.code}</option>)}</select></div>
                <div className="col-span-1 text-center"><span className="text-xs text-slate-400">Now: {currentQty}</span></div>
                <div className="col-span-2"><input type="number" className="input" min={0} placeholder="New qty" value={ln.quantityAfter} onChange={e => setLine(i, 'quantityAfter', e.target.value)} required /></div>
                <div className="col-span-1 text-center">
                  {ln.productId && ln.locationId && <span className={`text-xs font-bold ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>{delta > 0 ? '+' : ''}{delta}</span>}
                </div>
                <div className="col-span-1 text-center">{lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-400 text-lg">×</button>}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading}>{loading && <Spinner size="sm" />} Create Adjustment</button>
      </div>
    </form>
  );
}

export default function AdjustmentsPage() {
  const qc = useQueryClient();
  const { isManager } = useAuth();
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');
  const [modal, setModal]   = useState(false);
  const [formErr, setFE]    = useState('');
  const [confirm, setConfirm] = useState<{ type: 'confirm' | 'cancel'; id: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['adjustments', page, status],
    queryFn:  () => adjustmentApi.list({ page, limit: 20, status: status || undefined }).then(r => r.data.data),
  });
  const { data: products  = [] } = useQuery({ queryKey: ['products-all'],   queryFn: () => productApi.list({ limit: 500 }).then(r => r.data.data.products) });
  const { data: locations = [] } = useQuery({ queryKey: ['locations-all'],  queryFn: () => locationApi.list().then(r => r.data.data) });
  const { data: stockLevels = [] } = useQuery({ queryKey: ['stock-levels'], queryFn: () => stockApi.levels().then(r => r.data.data) });

  const createMut = useMutation({
    mutationFn: (d: object) => adjustmentApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adjustments'] }); setModal(false); setFE(''); },
    onError: (e: unknown) => setFE((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'),
  });

  const { confirm: confirmMut, cancel: cancelMut } = useDocumentActions('adjustments');
  const adjustments = data?.adjustments || [];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title flex items-center gap-2"><SlidersHorizontal className="w-5 h-5" /> Inventory Adjustments</h1><p className="page-subtitle">Correct stock discrepancies and cycle counts</p></div>
        {isManager && <button className="btn-primary" onClick={() => { setFE(''); setModal(true); }}><Plus className="w-4 h-4" /> New Adjustment</button>}
      </div>

      <div className="card p-4 mb-4"><StatusFilter value={status} onChange={v => { setStatus(v); setPage(1); }} /></div>

      <div className="card">
        {isLoading ? <PageLoader /> : adjustments.length === 0 ? <EmptyState message="No adjustments found" /> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Document #</th><th>Reason</th><th>Lines</th><th>Status</th><th>Created</th>{isManager && <th className="text-right">Actions</th>}</tr></thead>
              <tbody>
                {adjustments.map((a: { id: string; documentNumber: string; reason: string; lines: unknown[]; status: string; createdAt: string; }) => (
                  <tr key={a.id}>
                    <td><span className="font-mono text-xs font-medium text-brand-700">{a.documentNumber}</span></td>
                    <td><span className="badge-info">{a.reason.replace(/_/g,' ')}</span></td>
                    <td>{a.lines.length} line(s)</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-slate-400 text-xs">{format(new Date(a.createdAt), 'dd MMM yyyy')}</td>
                    {isManager && (
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {a.status === 'DRAFT' && <>
                            <button className="btn-ghost btn-sm text-emerald-600" onClick={() => setConfirm({ type: 'confirm', id: a.id })}><CheckCircle className="w-4 h-4" /></button>
                            <button className="btn-ghost btn-sm text-red-400"     onClick={() => setConfirm({ type: 'cancel',  id: a.id })}><XCircle className="w-4 h-4" /></button>
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

      <Modal open={modal} onClose={() => setModal(false)} title="New Inventory Adjustment" size="xl">
        <AdjustmentForm products={products} locations={locations} stockLevels={stockLevels} onSave={d => createMut.mutate(d)} onCancel={() => setModal(false)} loading={createMut.isPending} error={formErr} />
      </Modal>

      <ConfirmDialog
        open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => { if (confirm?.type === 'confirm') confirmMut.mutate(confirm.id); else cancelMut.mutate(confirm!.id); setConfirm(null); }}
        title={confirm?.type === 'confirm' ? 'Post Adjustment' : 'Cancel Adjustment'}
        message={confirm?.type === 'confirm' ? 'This will post all stock corrections to the ledger. This cannot be undone.' : 'Cancel this adjustment?'}
        confirmLabel={confirm?.type === 'confirm' ? 'Post Adjustment' : 'Cancel'}
        danger={confirm?.type === 'cancel'}
        loading={confirmMut.isPending || cancelMut.isPending}
      />
    </div>
  );
}
