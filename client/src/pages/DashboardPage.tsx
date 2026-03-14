import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';
import { PageLoader, MovementBadge } from '../components/ui';
import {
  Package, Warehouse, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, AlertTriangle, Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface KPIs {
  totalProducts: number;
  totalWarehouses: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  pendingTransfers: number;
}

interface LowAlert { product: { sku: string; name: string; reorderLevel: number }; totalQty: number; }
interface Movement {
  id: string; movementType: string; quantity: number; balanceAfter: number; createdAt: string;
  product: { sku: string; name: string };
  location: { code: string; warehouse: { name: string } };
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => dashboardApi.get().then(r => r.data.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return <PageLoader />;
  const kpis: KPIs         = data?.kpis || {};
  const alerts: LowAlert[] = data?.lowStockAlerts || [];
  const movements: Movement[] = data?.recentMovements || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Inventory overview and real-time status</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Active Products"    value={kpis.totalProducts}    icon={Package}         color="bg-brand-600" />
        <KpiCard label="Warehouses"         value={kpis.totalWarehouses}  icon={Warehouse}       color="bg-teal-600" />
        <KpiCard label="Pending Receipts"   value={kpis.pendingReceipts}  icon={ArrowDownToLine} color="bg-emerald-600" />
        <KpiCard label="Pending Deliveries" value={kpis.pendingDeliveries}icon={ArrowUpFromLine} color="bg-orange-500" />
        <KpiCard label="Pending Transfers"  value={kpis.pendingTransfers} icon={ArrowLeftRight}  color="bg-violet-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock alerts */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Low Stock Alerts</h2>
            {alerts.length > 0 && (
              <span className="ml-auto badge bg-amber-100 text-amber-800">{alerts.length}</span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">All stock levels healthy ✓</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <div key={a.product.sku} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{a.product.name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{a.product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{a.totalQty}</p>
                    <p className="text-xs text-slate-400">min {a.product.reorderLevel}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent movements */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-900 text-sm">Recent Stock Movements</h2>
          </div>
          {movements.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No movements yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {movements.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                  <MovementBadge type={m.movementType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{m.product.name}</p>
                    <p className="text-xs text-slate-400">{m.location.warehouse.name} · {m.location.code}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold font-mono ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
