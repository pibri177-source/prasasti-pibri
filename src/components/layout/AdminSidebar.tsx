import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  CheckCircle,
  Users,
  BarChart3,
  Store,
  Sprout,
  RotateCcw,
  LogOut,
  AlertCircle,
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const { orders, products, resetAllData } = useApp();
  const { currentUser, logout } = useAuth();

  const pendingApprovals = orders.filter((o) => o.orderStatus === 'PENDING_APPROVAL').length;
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  const navItems = [
    {
      to: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/admin/pos',
      label: 'Kasir Toko (POS)',
      icon: ShoppingCart,
      highlight: true,
    },
    {
      to: '/admin/products',
      label: 'Kelola Produk & Stok',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} menipis` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      to: '/admin/orders',
      label: 'Kelola Pesanan',
      icon: ClipboardList,
      badge: orders.length > 0 ? `${orders.length}` : undefined,
    },
    {
      to: '/admin/approvals',
      label: 'Approval Pembayaran',
      icon: CheckCircle,
      badge: pendingApprovals > 0 ? `${pendingApprovals} Baru` : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 font-bold',
    },
    {
      to: '/admin/customers',
      label: 'Data Pelanggan',
      icon: Users,
    },
    {
      to: '/admin/reports',
      label: 'Laporan Penjualan',
      icon: BarChart3,
    },
  ];

  return (
    <aside className="w-64 bg-stone-900 text-stone-200 flex flex-col shrink-0 min-h-screen border-r border-stone-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-stone-800">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white">
            <Sprout className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <div className="font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>TaniMakmur</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded">
                Admin
              </span>
            </div>
            <p className="text-xs text-stone-400">Sistem POS & Inventori</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Menu Operasional
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : item.highlight
                    ? 'text-emerald-300 hover:bg-stone-800 hover:text-emerald-200'
                    : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Toko Online & Utilitas
        </div>

        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-300 hover:bg-stone-800 hover:text-white transition"
        >
          <Store className="w-4 h-4 text-emerald-400" />
          <span>Lihat Marketplace</span>
        </Link>

        <button
          onClick={() => resetAllData()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400/90 hover:bg-stone-800 hover:text-amber-300 transition text-left"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Data Default</span>
        </button>
      </nav>

      {/* User Info & Switch */}
      <div className="p-4 border-t border-stone-800 bg-stone-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center font-bold text-xs text-emerald-300">
              {currentUser?.name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate max-w-[120px]">
                {currentUser?.name}
              </p>
              <p className="text-[11px] text-stone-400 capitalize">{currentUser?.role}</p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="text-stone-400 hover:text-white p-1 rounded hover:bg-stone-800 transition cursor-pointer"
            title="Keluar dari Akun Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[11px] text-stone-400 flex items-center gap-1.5 pt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>IndexedDB Online Sync</span>
        </div>
      </div>
    </aside>
  );
};
