import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockApi, productApi, locationApi } from '../api';
import { PageLoader, EmptyState, Pagination, MovementBadge, QtyCell } from '../components/ui';
import { BarChart3, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

interface StockLevel {
  productId: string; locationId: string; quantity: number;
  product:  { sku: string; name: string; reorderLevel: number };
  location: { code: string; name: string; warehouse: { name: string } };
}

interface Movement {
  id: string; movementType: string; quantity: number; balanceAfter: number;
  referenceType: string; referenceId: string; createdAt: string; notes?: string;
  product:  { sku: string; name: string };
  location: { code: string; name: string; warehouse: { name: string } };
}

// ── Stock Levels Tab ──────────────────────────────────────────────────────────
function StockLevelsTab() {
  const [productFilter, setProductFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ['stock-levels'],
    queryFn:  () => stockApi.levels().then(r => r.data.data),
  });

  const filtered: StockLevel[] = levels.filter((s: StockLevel) => {
    const matchProduct   = !productFilter   || s.product.name.toLowerCase().includes(productFilter.toLowerCase()) || s.product.sku.toLowerCase().includes(productFilter.toLowerCase());
    const matchWarehouse = !warehouseFilter || s.location.warehouse.name.toLowerCase().includes(warehouseFilter.toLowerCase());
    return matchProduct && matchWarehouse;
  });

  return (
    <div>
      {/* Filters */}
      <div className="card p-4 mb-4 flex gap-3 flex-wrap">
        <input className="input max-w-xs" placeholder="Filter by product / SKU..." value={productFilter} onChange={e => setProductFilter(e.target.value)} />
        <input className="input max-w-xs" placeholder="Filter by warehouse..." value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} />
        <span className="ml-auto text-sm text-slate-500 self-center">{filtered.length} records</span>
      </div>

      <div className="card">
        {isLoading ? <PageLoader /> : filtered.length === 0 ? <EmptyState message="No stock found — create a receipt to add stock" /> : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Location</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: StockLevel) => (
                  <tr key={`${s.productId}-${s.locationId}`}>
                    <td><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{s.product.sku}</span></td>
                    <td className="font-medium text-slate-900">{s.product.name}</td>
                    <td>{s.location.warehouse.name}</td>
                    <td>
                      <span className="font-mono text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded">
                        {s.location.code}
                      </span>
                      <span className="text-slate-400 ml-2 text-xs">{s.location.name}</span>
                    </td>
                    <td className="text-right">
                      <QtyCell qty={s.quantity} reorderLevel={s.product.reorderLevel} />
                    </td>
                    <td className="text-right text-slate-400">{s.product.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Movements Ledger Tab ──────────────────────────────────────────────────────
function MovementsTab() {
  const [page, setPage] = useState(1);
  const [productId, setProductId]   = useState('');
  const [locationId, setLocationId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', page, productId, locationId],
    queryFn:  () => stockApi.movements({
      page, limit: 50,
      productId:  productId  || undefined,
      locationId: locationId || undefined,
    }).then(r => r.data.data),
  });

  const { data: products  = [] } = useQuery({ queryKey: ['products-all'],  queryFn: () => productApi.list({ limit: 500 }).then(r => r.data.data.products) });
  const { data: locations = [] } = useQuery({ queryKey: ['locations-all'], queryFn: () => locationApi.list().then(r => r.data.data) });

  const movements: Movement[] = data?.movements || [];

  return (
    <div>
      {/* Filters */}
      <div className="card p-4 mb-4 flex gap-3 flex-wrap">
        <select className="input w-auto" value={productId} onChange={e => { setProductId(e.target.value); setPage(1); }}>
          <option value="">All products</option>
          {(products as { id: string; sku: string; name: string }[]).map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
        </select>
        <select className="input w-auto" value={locationId} onChange={e => { setLocationId(e.target.value); setPage(1); }}>
          <option value="">All locations</option>
          {(locations as { id: string; code: string; name: string; warehouse: { name: string } }[]).map(l => <option key={l.id} value={l.id}>{l.warehouse.name} · {l.code}</option>)}
        </select>
      </div>

      <div className="card">
        {isLoading ? <PageLoader /> : movements.length === 0 ? <EmptyState message="No movements recorded yet" /> : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Location</th>
                  <th>Reference</th>
                  <th className="text-right">Qty Change</th>
                  <th className="text-right">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m: Movement) => (
                  <tr key={m.id}>
                    <td className="text-xs text-slate-400 whitespace-nowrap">
                      {format(new Date(m.createdAt), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td><MovementBadge type={m.movementType} /></td>
                    <td>
                      <div className="font-medium text-slate-900 text-sm">{m.product.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{m.product.sku}</div>
                    </td>
                    <td>
                      <div className="text-sm">{m.location.warehouse.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{m.location.code}</div>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">{m.referenceType}</span>
                      <span className="text-xs text-slate-300 ml-1">#{m.referenceId.slice(-6)}</span>
                    </td>
                    <td className="text-right">
                      <span className={`font-mono font-bold text-sm ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </span>
                    </td>
                    <td className="text-right font-mono text-slate-700">{m.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Pagination page={page} total={data?.total || 0} limit={50} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}

// ── Main Stock Page ───────────────────────────────────────────────────────────
export default function StockPage() {
  const [tab, setTab] = useState<'levels' | 'movements'>('levels');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Stock Management</h1>
          <p className="page-subtitle">Real-time inventory levels and movement history</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
        <button
          onClick={() => setTab('levels')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'levels' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Stock Levels
        </button>
        <button
          onClick={() => setTab('movements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'movements' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Movement Ledger
        </button>
      </div>

      {tab === 'levels' ? <StockLevelsTab /> : <MovementsTab />}
    </div>
  );
}
