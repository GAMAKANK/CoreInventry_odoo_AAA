import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi, locationApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal, PageLoader, EmptyState, ErrorMsg, Spinner } from '../components/ui';
import { Plus, Warehouse, MapPin } from 'lucide-react';

interface Location { id: string; code: string; name: string; }
interface WarehouseT { id: string; code: string; name: string; address?: string; locations: Location[]; }

export default function WarehousesPage() {
  const qc = useQueryClient();
  const { isManager } = useAuth();
  const [modal, setModal]   = useState<'wh' | 'loc' | null>(null);
  const [activeWh, setActiveWh] = useState<WarehouseT | null>(null);
  const [whForm, setWhForm] = useState({ code: '', name: '', address: '' });
  const [locForm, setLocForm] = useState({ code: '', name: '', warehouseId: '' });
  const [err, setErr] = useState('');

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn:  () => warehouseApi.list().then(r => r.data.data),
  });

  const saveWh = useMutation({
    mutationFn: (d: object) => warehouseApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); setModal(null); setErr(''); },
    onError: (e: unknown) => setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'),
  });

  const saveLoc = useMutation({
    mutationFn: (d: object) => locationApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); setModal(null); setErr(''); },
    onError: (e: unknown) => setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Warehouse className="w-5 h-5" /> Warehouses</h1>
          <p className="page-subtitle">Manage warehouses and storage locations</p>
        </div>
        {isManager && (
          <button className="btn-primary" onClick={() => { setWhForm({ code: '', name: '', address: '' }); setErr(''); setModal('wh'); }}>
            <Plus className="w-4 h-4" /> Add Warehouse
          </button>
        )}
      </div>

      {isLoading ? <PageLoader /> : warehouses.length === 0 ? <EmptyState /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(warehouses as WarehouseT[]).map(wh => (
            <div key={wh.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-medium">{wh.code}</span>
                    <h3 className="font-semibold text-slate-900">{wh.name}</h3>
                  </div>
                  {wh.address && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{wh.address}</p>}
                </div>
                {isManager && (
                  <button className="btn-ghost btn-sm text-xs" onClick={() => {
                    setActiveWh(wh);
                    setLocForm({ code: '', name: '', warehouseId: wh.id });
                    setErr('');
                    setModal('loc');
                  }}>
                    <Plus className="w-3 h-3" /> Location
                  </button>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Locations ({wh.locations.length})
                </p>
                {wh.locations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No locations yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {wh.locations.map(l => (
                      <span key={l.id} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">{l.code} — {l.name}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Warehouse */}
      <Modal open={modal === 'wh'} onClose={() => setModal(null)} title="Add Warehouse" size="sm">
        <form onSubmit={e => { e.preventDefault(); saveWh.mutate(whForm); }} className="space-y-4">
          {err && <ErrorMsg message={err} />}
          <div><label className="label">Code *</label><input className="input font-mono" value={whForm.code} onChange={e => setWhForm(f => ({ ...f, code: e.target.value }))} placeholder="WH-001" required /></div>
          <div><label className="label">Name *</label><input className="input" value={whForm.name} onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><label className="label">Address</label><input className="input" value={whForm.address} onChange={e => setWhForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveWh.isPending}>{saveWh.isPending && <Spinner size="sm" />} Create</button>
          </div>
        </form>
      </Modal>

      {/* Create Location */}
      <Modal open={modal === 'loc'} onClose={() => setModal(null)} title={`Add Location — ${activeWh?.name}`} size="sm">
        <form onSubmit={e => { e.preventDefault(); saveLoc.mutate(locForm); }} className="space-y-4">
          {err && <ErrorMsg message={err} />}
          <div><label className="label">Location Code *</label><input className="input font-mono" value={locForm.code} onChange={e => setLocForm(f => ({ ...f, code: e.target.value }))} placeholder="A-01" required /></div>
          <div><label className="label">Name *</label><input className="input" value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} placeholder="Aisle A, Shelf 1" required /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveLoc.isPending}>{saveLoc.isPending && <Spinner size="sm" />} Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
