import { ReactNode, useEffect } from 'react';
import { X, Loader2, Inbox } from 'lucide-react';

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeMap[size]} max-h-[90vh] flex flex-col animate-fadeIn`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT:     'badge-draft',
    CONFIRMED: 'badge-confirmed',
    CANCELLED: 'badge-cancelled',
  };
  return <span className={map[status] || 'badge-draft'}>{status}</span>;
}

// ── Movement type badge ───────────────────────────────────────────────────────
export function MovementBadge({ type }: { type: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    RECEIPT:      { cls: 'badge-confirmed', label: 'Receipt'   },
    DELIVERY:     { cls: 'badge-cancelled', label: 'Delivery'  },
    TRANSFER_IN:  { cls: 'badge-info',      label: 'Xfer In'   },
    TRANSFER_OUT: { cls: 'badge-warning',   label: 'Xfer Out'  },
    ADJUSTMENT:   { cls: 'badge-draft',     label: 'Adjust'    },
  };
  const { cls, label } = map[type] || { cls: 'badge-draft', label: type };
  return <span className={cls}>{label}</span>;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return <Loader2 className={`${s} animate-spin text-brand-600`} />;
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ message = 'No records found' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Inbox className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger, loading }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <Spinner size="sm" /> : null}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (p: number) => void;
}

export function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
      <span>Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}</span>
      <div className="flex gap-1">
        <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => onChange(page - 1)}>Prev</button>
        <button className="btn-secondary btn-sm" disabled={page === pages} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

// ── Search input ──────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      className="input max-w-xs"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// ── Status filter ─────────────────────────────────────────────────────────────
export function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="input w-auto" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">All statuses</option>
      <option value="DRAFT">Draft</option>
      <option value="CONFIRMED">Confirmed</option>
      <option value="CANCELLED">Cancelled</option>
    </select>
  );
}

// ── Error message ─────────────────────────────────────────────────────────────
export function ErrorMsg({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

// ── Quantity indicator (colored) ──────────────────────────────────────────────
export function QtyCell({ qty, reorderLevel }: { qty: number; reorderLevel?: number }) {
  const isLow = reorderLevel !== undefined && qty <= reorderLevel;
  return (
    <span className={`font-mono font-medium ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
      {qty}
      {isLow && <span className="ml-1 text-xs text-red-400">↓low</span>}
    </span>
  );
}
