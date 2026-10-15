import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, CheckCircle, Bell, ArrowUpRight } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, subtitle, action }) => {
  const { orders } = useApp();
  const { currentUser } = useAuth();

  const pendingApprovals = orders.filter((o) => o.orderStatus === 'PENDING_APPROVAL').length;

  return (
    <header className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-stone-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {pendingApprovals > 0 && (
          <Link
            to="/admin/approvals"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition animate-pulse"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{pendingApprovals} Bukti Bayar Menunggu</span>
          </Link>
        )}

        <Link
          to="/admin/pos"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition shadow-xs"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Buka Kasir POS</span>
        </Link>

        {action}
      </div>
    </header>
  );
};
