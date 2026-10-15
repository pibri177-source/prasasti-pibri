import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  Sprout,
  ShoppingCart,
  Store,
  Package,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { cartItemCount, setIsCartDrawerOpen, orders, customers } = useApp();
  const { currentUser, isAdmin, logout } = useAuth();
  const location = useLocation();

  // Count strictly the current customer's own orders (excluding sample admin orders)
  const customerOrdersCount = useMemo(() => {
    return orders.filter((o) => {
      // Never count sample admin orders
      if (
        o.isSample ||
        o.id === 'ord-101' ||
        o.id === 'ord-102' ||
        o.id === 'ord-103' ||
        o.customerId?.startsWith('sample-')
      ) {
        return false;
      }

      // 1. If logged in as customer: strict isolation
      if (currentUser && currentUser.role === 'customer') {
        const myCustomer = customers.find(
          (c) =>
            c.id === currentUser.id ||
            (currentUser.phone && c.phone && c.phone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '')) ||
            (currentUser.email && c.email && c.email.toLowerCase() === currentUser.email.toLowerCase())
        );

        const validIds = new Set([currentUser.id, myCustomer?.id].filter(Boolean) as string[]);
        if (o.customerId && validIds.has(o.customerId)) return true;

        // Scoped user order ids
        try {
          const userKey = `tanimakmur_customer_orders_${currentUser.id}`;
          const userOrders: string[] = JSON.parse(localStorage.getItem(userKey) || '[]');
          if (userOrders.includes(o.id)) return true;
        } catch {
          // ignore
        }

        const phoneDigits = (currentUser.phone || myCustomer?.phone || '').replace(/\D/g, '');
        if (phoneDigits && o.customerPhone && o.customerPhone.replace(/\D/g, '') === phoneDigits) {
          return true;
        }

        return false;
      }

      // 2. If admin: show test orders count
      if (currentUser && currentUser.role === 'admin') {
        return true;
      }

      // 3. Guest mode only: match device local storage
      try {
        const storedIds: string[] = JSON.parse(localStorage.getItem('tanimakmur_customer_orders') || '[]');
        if (storedIds.includes(o.id)) return true;
      } catch {
        // ignore
      }

      return false;
    }).length;
  }, [orders, customers, currentUser]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Top Banner info - Clean customer experience with no admin or POS panels */}
      <div className="bg-stone-900 text-stone-200 px-4 py-1.5 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Kios Obat Pertanian & Bibit Unggul • Karawang</span>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-stone-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-emerald-300">{currentUser.name}</span>
                </span>

                <button
                  onClick={() => logout()}
                  className="text-stone-400 hover:text-white px-2 py-0.5 rounded transition flex items-center gap-1 hover:bg-stone-800"
                  title="Keluar dari akun"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Keluar</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-stone-300 hover:text-emerald-300 px-2 py-0.5 rounded transition flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Masuk Akun</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs group-hover:bg-emerald-800 transition">
              <Sprout className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="font-extrabold text-lg sm:text-xl tracking-tight text-stone-900 flex items-center gap-1.5">
                <span>TaniMakmur</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  UMKM
                </span>
              </div>
              <p className="text-xs text-stone-500 -mt-0.5 hidden sm:block">
                Kios Obat & Bibit Pertanian Modern
              </p>
            </div>
          </Link>

          {/* Customer Navigation Links: Only Katalog Produk, Pesanan Saya, and Keranjang */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition flex items-center gap-1.5 ${
                location.pathname === '/'
                  ? 'text-emerald-800 bg-emerald-50'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Katalog Produk</span>
            </Link>

            <Link
              to="/orders"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition flex items-center gap-1.5 relative ${
                location.pathname === '/orders'
                  ? 'text-emerald-800 bg-emerald-50'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Pesanan Saya</span>
              {customerOrdersCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {customerOrdersCount}
                </span>
              )}
            </Link>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-2.5 rounded-lg border border-stone-200 text-stone-700 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition"
              aria-label="Keranjang Belanja"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
