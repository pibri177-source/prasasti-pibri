import React, { useState, useMemo } from 'react';
import { useApp, formatRupiah, formatDateIndo } from '../../context/AppContext';
import { AdminHeader } from '../../components/layout/AdminHeader';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  DollarSign,
  TrendingUp,
  Package,
  ShoppingCart,
  Store,
  CreditCard,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { orders, transactions, products } = useApp();

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  // Filter transactions based on date filter
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const txDate = new Date(t.createdAt);
      if (dateFilter === 'TODAY') {
        return txDate.toDateString() === now.toDateString();
      }
      if (dateFilter === 'WEEK') {
        const diffTime = Math.abs(now.getTime() - txDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      if (dateFilter === 'MONTH') {
        return (
          txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [transactions, dateFilter]);

  // Aggregate metrics
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalProfit = filteredTransactions.reduce((sum, t) => sum + t.profit, 0);
  const totalCount = filteredTransactions.length;
  const avgOrderValue = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

  // Channel breakdown
  const posSales = filteredTransactions
    .filter((t) => t.type === 'POS')
    .reduce((sum, t) => sum + t.total, 0);
  const onlineSales = filteredTransactions
    .filter((t) => t.type === 'MARKETPLACE')
    .reduce((sum, t) => sum + t.total, 0);

  // Top selling products aggregated from completed orders
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; category: string; quantity: number; revenue: number }> = {};

    // Filter relevant orders
    const targetOrderIds = new Set(filteredTransactions.map((t) => t.orderId));
    const targetOrders = orders.filter((o) => targetOrderIds.has(o.id));

    targetOrders.forEach((o) => {
      o.items.forEach((it) => {
        if (!counts[it.productId]) {
          counts[it.productId] = {
            name: it.productName,
            category: it.category,
            quantity: 0,
            revenue: 0,
          };
        }
        counts[it.productId].quantity += it.quantity;
        counts[it.productId].revenue += it.subtotal;
      });
    });

    return Object.values(counts).sort((a, b) => b.quantity - a.quantity);
  }, [filteredTransactions, orders]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      // No alert in iframe
      return;
    }

    const headers = ['ID Transaksi', 'No Pesanan', 'Tipe', 'Pelanggan', 'Metode Bayar', 'Total (Rp)', 'Laba (Rp)', 'Tanggal'];
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.orderNumber,
      t.type,
      `"${t.customerName}"`,
      t.paymentMethod,
      t.total,
      t.profit,
      t.createdAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan-penjualan-${dateFilter.toLowerCase()}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 min-w-0 bg-stone-50 min-h-screen">
      <AdminHeader
        title="Laporan Penjualan & Performa Bisnis"
        subtitle="Analisis omset penjualan obat dan bibit, profitabilitas, serta peringkat produk terlaris"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition shadow-2xs"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Ekspor CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition shadow-2xs"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        }
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Date Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Filter Rentang Waktu:</span>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Semua Waktu' },
              { id: 'TODAY', label: 'Hari Ini' },
              { id: 'WEEK', label: '7 Hari Terakhir' },
              { id: 'MONTH', label: 'Bulan Ini' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  dateFilter === tab.id
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-xs font-semibold text-stone-500">Total Omset Penjualan</span>
            <div className="text-2xl font-black text-stone-900 mt-1">
              {formatRupiah(totalRevenue)}
            </div>
            <div className="text-[11px] text-stone-400 mt-1">Pendapatan kotor terverifikasi</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-xs font-semibold text-stone-500">Estimasi Laba Kotor</span>
            <div className="text-2xl font-black text-emerald-800 mt-1">
              {formatRupiah(totalProfit)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              Margin:{' '}
              {totalRevenue > 0 ? `${Math.round((totalProfit / totalRevenue) * 100)}%` : '0%'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-xs font-semibold text-stone-500">Jumlah Transaksi</span>
            <div className="text-2xl font-black text-stone-900 mt-1">{totalCount}</div>
            <div className="text-[11px] text-stone-400 mt-1">Transaksi sukses tercatat</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-xs font-semibold text-stone-500">Rata-Rata Belanja (AOV)</span>
            <div className="text-2xl font-black text-stone-900 mt-1">
              {formatRupiah(avgOrderValue)}
            </div>
            <div className="text-[11px] text-stone-400 mt-1">Per transaksi pelanggan</div>
          </div>
        </div>

        {/* Top Selling Products & Channel Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top Selling Products (7 Cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <span>Peringkat Produk Terlaris (Top Selling)</span>
              </h3>
              <p className="text-xs text-stone-500">Diurutkan berdasarkan kuantitas yang terjual</p>
            </div>

            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-stone-400 text-xs">
                Belum ada data produk terjual pada periode ini.
              </p>
            ) : (
              <div className="divide-y divide-stone-100">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-800'
                            : idx === 1
                            ? 'bg-stone-200 text-stone-800'
                            : idx === 2
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-stone-900">{p.name}</div>
                        <div className="text-[11px] text-emerald-800 font-medium">
                          {p.category}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-stone-900">
                        {p.quantity} pcs terjual
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Total {formatRupiah(p.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sales Breakdown by Channel (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Distribusi Saluran Usaha</h3>
              <p className="text-xs text-stone-500">Perbandingan POS Counter vs Toko Online</p>
            </div>

            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 text-xs">Kasir Toko Fisik (POS)</span>
                  <span className="font-black text-emerald-900 text-sm">
                    {formatRupiah(posSales)}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  {totalRevenue > 0 ? Math.round((posSales / totalRevenue) * 100) : 0}% dari total
                  omset
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 text-xs">Marketplace Online</span>
                  <span className="font-black text-blue-900 text-sm">
                    {formatRupiah(onlineSales)}
                  </span>
                </div>
                <div className="text-[11px] text-blue-700 mt-1">
                  {totalRevenue > 0 ? Math.round((onlineSales / totalRevenue) * 100) : 0}% dari total
                  omset
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-2 text-stone-600">
              <div className="font-bold text-stone-800">Catatan Audit Keuangan:</div>
              <p className="text-[11px] leading-relaxed">
                Seluruh data transaksi ini disimpan di IndexedDB browser lokal Anda dan tidak akan hilang saat reload halaman.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
