import React from 'react';
import { Link } from 'react-router-dom';
import { useApp, formatRupiah, formatDateIndo } from '../../context/AppContext';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { OrderStatusBadge } from '../../components/common/Badge';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Store,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { products, orders, transactions, customers } = useApp();

  // Metrics
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalProfit = transactions.reduce((sum, t) => sum + t.profit, 0);
  const totalTransactionsCount = transactions.length;
  const activeProductsCount = products.filter((p) => p.isActive).length;
  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);
  const pendingApprovals = orders.filter((o) => o.orderStatus === 'PENDING_APPROVAL');

  // Channel breakdown
  const posSales = transactions
    .filter((t) => t.type === 'POS')
    .reduce((sum, t) => sum + t.total, 0);
  const onlineSales = transactions
    .filter((t) => t.type === 'MARKETPLACE')
    .reduce((sum, t) => sum + t.total, 0);

  // Recent 5 transactions/orders
  const recentOrders = [...orders].slice(0, 5);

  return (
    <div className="flex-1 min-w-0 bg-stone-50 min-h-screen">
      <AdminHeader
        title="Dashboard Ringkasan Usaha"
        subtitle="Pantau pendapatan, perputaran stok pupuk & obat, serta verifikasi pesanan tani"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Pending Approval Banner Alert if any */}
        {pendingApprovals.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-950 text-sm">
                  Ada {pendingApprovals.length} Pembayaran Marketplace Menunggu Verifikasi
                </h3>
                <p className="text-xs text-amber-800">
                  Pembeli telah mengunggah bukti transfer. Silakan periksa keabsahan bukti bayar.
                </p>
              </div>
            </div>

            <Link
              to="/admin/approvals"
              className="px-4 py-2 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
            >
              <span>Verifikasi Sekarang</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold">Total Pendapatan</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-stone-900 tracking-tight">
              {formatRupiah(totalRevenue)}
            </div>
            <div className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Est. Laba Kotor: {formatRupiah(totalProfit)}</span>
            </div>
          </div>

          {/* Transactions Count */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold">Jumlah Transaksi Sukses</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-stone-900 tracking-tight">
              {totalTransactionsCount}
            </div>
            <div className="mt-2 text-[11px] text-stone-500">
              POS: {transactions.filter((t) => t.type === 'POS').length} • Online:{' '}
              {transactions.filter((t) => t.type === 'MARKETPLACE').length}
            </div>
          </div>

          {/* Active Products */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold">Produk Terdaftar</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-stone-900 tracking-tight">
              {activeProductsCount}
            </div>
            <div className="mt-2 text-[11px] text-stone-500">
              {lowStockProducts.length > 0 ? (
                <span className="text-amber-600 font-semibold">
                  {lowStockProducts.length} produk stok menipis
                </span>
              ) : (
                <span className="text-emerald-700">Semua stok produk aman</span>
              )}
            </div>
          </div>

          {/* Customers */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold">Pelanggan Petani</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-stone-900 tracking-tight">
              {customers.length}
            </div>
            <div className="mt-2 text-[11px] text-stone-500">
              Kelompok Tani & Petani Mandiri
            </div>
          </div>
        </div>

        {/* Sales by Channel & Low Stock Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sales by Channel breakdown */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Performa Saluran Penjualan</h3>
                <p className="text-xs text-stone-500">Perbandingan transaksi Kasir Toko fisik vs Marketplace online</p>
              </div>
              <Link to="/admin/reports" className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1">
                Laporan Lengkap <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-2 text-stone-600 text-xs font-semibold mb-1">
                  <Store className="w-4 h-4 text-emerald-700" />
                  <span>Kasir Toko (POS)</span>
                </div>
                <div className="text-lg font-black text-stone-900">
                  {formatRupiah(posSales)}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  {transactions.filter((t) => t.type === 'POS').length} transaksi langsung di kasir
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-2 text-stone-600 text-xs font-semibold mb-1">
                  <ShoppingCart className="w-4 h-4 text-blue-700" />
                  <span>Marketplace Online</span>
                </div>
                <div className="text-lg font-black text-stone-900">
                  {formatRupiah(onlineSales)}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  {transactions.filter((t) => t.type === 'MARKETPLACE').length} pesanan via web toko
                </div>
              </div>
            </div>

            {/* Visual ratio bar */}
            <div className="pt-2">
              <div className="flex justify-between text-xs font-medium text-stone-600 mb-1.5">
                <span>Rasio POS vs Marketplace</span>
                <span>
                  {totalRevenue > 0
                    ? `${Math.round((posSales / totalRevenue) * 100)}% POS / ${Math.round(
                        (onlineSales / totalRevenue) * 100
                      )}% Web`
                    : 'Belum ada transaksi'}
                </span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-700 h-full transition-all duration-500"
                  style={{
                    width: totalRevenue > 0 ? `${(posSales / totalRevenue) * 100}%` : '50%',
                  }}
                />
                <div
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{
                    width: totalRevenue > 0 ? `${(onlineSales / totalRevenue) * 100}%` : '50%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Peringatan Stok Menipis</span>
                </h3>
                <p className="text-xs text-stone-500">Stok di bawah batas minimum pengingat</p>
              </div>
              <Link
                to="/admin/products"
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
              >
                Kelola Stok
              </Link>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-semibold text-stone-800">Semua Persediaan Aman</p>
                <p className="text-[11px] text-stone-400 mt-0.5">Tidak ada barang yang memerlukan restock mendesak.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 max-h-56 overflow-y-auto pr-1">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-stone-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-stone-500">
                        {p.code} • Min: {p.minStock} {p.unit}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-amber-100 text-amber-800 shrink-0">
                      Sisa {p.stock} {p.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Aktivitas Transaksi Terbaru</h3>
              <p className="text-xs text-stone-500">5 transaksi terakhir dari toko & marketplace</p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
            >
              Semua Pesanan <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 font-semibold">
                  <th className="pb-3">No. Pesanan</th>
                  <th className="pb-3">Pelanggan</th>
                  <th className="pb-3">Channel</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Waktu</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-stone-50/50">
                    <td className="py-3 font-mono font-bold text-stone-900">{ord.orderNumber}</td>
                    <td className="py-3 font-medium text-stone-800">{ord.customerName}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700">
                        {ord.type === 'POS' ? 'Kasir POS' : 'Marketplace'}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-emerald-800">{formatRupiah(ord.total)}</td>
                    <td className="py-3 text-stone-500">{formatDateIndo(ord.createdAt)}</td>
                    <td className="py-3">
                      <OrderStatusBadge status={ord.orderStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
