import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tag, Warehouse, ArrowDownToLine,
  ArrowUpFromLine, ArrowLeftRight, SlidersHorizontal,
  BarChart3, LogOut, ChevronRight, Boxes
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/',            icon: LayoutDashboard,   label: 'Dashboard',    end: true },
  { to: '/stock',       icon: BarChart3,          label: 'Stock Levels' },
  { to: '/products',    icon: Package,            label: 'Products' },
  { to: '/categories',  icon: Tag,                label: 'Categories' },
  { to: '/warehouses',  icon: Warehouse,          label: 'Warehouses' },
  { to: '/receipts',    icon: ArrowDownToLine,    label: 'Receipts' },
  { to: '/deliveries',  icon: ArrowUpFromLine,    label: 'Deliveries' },
  { to: '/transfers',   icon: ArrowLeftRight,     label: 'Transfers' },
  { to: '/adjustments', icon: SlidersHorizontal,  label: 'Adjustments' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-pink-50 border-r border-pink-200 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">CoreInventory</p>
              <p className="text-xs text-slate-400 mt-0.5">Warehouse Management</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Menu</p>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-brand-700">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.role}</p>
            </div>
            <button onClick={logout} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
