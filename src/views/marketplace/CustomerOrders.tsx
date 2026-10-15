import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp, formatRupiah, formatDateIndo } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { orderRepo } from '../../services/db';
import { Order, OrderStatus } from '../../types';
import {
  Package,
  ArrowLeft,
  Calendar,
  Eye,
  FileImage,
  Store,
  Printer,
  Search,
  CheckCircle2,
  MapPin,
  User,
  Truck,
  Check,
  PackageCheck,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react';

type StatusTab = 'ALL' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED';

export const CustomerOrders: React.FC = () => {
  const { orders, customers, refreshData, showToast } = useApp();
  const { currentUser } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');

  // Claim/Confirm Delivery Modal state
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const [customerNote, setCustomerNote] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Helper function to strictly determine if an order belongs to the current user
  const orderBelongsToUser = (o: Order): boolean => {
    // 0. Exclude admin sample data
    if (
      o.isSample ||
      o.id === 'ord-101' ||
      o.id === 'ord-102' ||
      o.id === 'ord-103' ||
      o.customerId?.startsWith('sample-')
    ) {
      return false;
    }

    // SCENARIO A: Logged-in Customer (e.g. Saras or Felina)
    if (currentUser && currentUser.role === 'customer') {
      const myCustomer = customers.find(
        (c) =>
          c.id === currentUser.id ||
          (currentUser.phone && c.phone && c.phone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, '')) ||
          (currentUser.email && c.email && c.email.toLowerCase() === currentUser.email.toLowerCase())
      );

      const validCustomerIds = new Set<string>();
      if (currentUser.id) validCustomerIds.add(currentUser.id);
      if (myCustomer?.id) validCustomerIds.add(myCustomer.id);

      // Check direct customer ID match
      if (o.customerId && validCustomerIds.has(o.customerId)) {
        return true;
      }

      // Check user-scoped local storage (orders created by THIS specific account)
      try {
        const userScopedKey = `tanimakmur_customer_orders_${currentUser.id}`;
        const userScopedIds: string[] = JSON.parse(localStorage.getItem(userScopedKey) || '[]');
        if (userScopedIds.includes(o.id)) return true;

        if (myCustomer?.id && myCustomer.id !== currentUser.id) {
          const custKey = `tanimakmur_customer_orders_${myCustomer.id}`;
          const custScopedIds: string[] = JSON.parse(localStorage.getItem(custKey) || '[]');
          if (custScopedIds.includes(o.id)) return true;
        }
      } catch {
        // ignore parse error
      }

      // Check phone match
      const userPhone = (currentUser.phone || myCustomer?.phone || '').replace(/\D/g, '');
      if (userPhone && o.customerPhone) {
        const orderPhone = o.customerPhone.replace(/\D/g, '');
        if (orderPhone && orderPhone === userPhone) {
          return true;
        }
      }

      // Check exact customer name ONLY IF customerId is unset or matches
      const userName = (currentUser.name || myCustomer?.name || '').trim().toLowerCase();
      if (userName && o.customerName && o.customerName.trim().toLowerCase() === userName) {
        const otherCustomer = customers.find((c) => c.id === o.customerId);
        if (!otherCustomer || validCustomerIds.has(otherCustomer.id)) {
          return true;
        }
      }

      // When logged in as a specific customer, DO NOT fallback to shared browser cache!
      return false;
    }

    // SCENARIO B: Logged-in Admin (previewing/testing)
    if (currentUser && currentUser.role === 'admin') {
      return true;
    }

    // SCENARIO C: Guest / Visitor (Not logged in)
    // Only in guest mode do we inspect shared device local storage
    try {
      const storedOrderIds: string[] = JSON.parse(localStorage.getItem('tanimakmur_customer_orders') || '[]');
      if (storedOrderIds.includes(o.id)) return true;

      const lastPhone = (localStorage.getItem('tanimakmur_customer_last_phone') || '').replace(/\D/g, '');
      if (lastPhone && o.customerPhone && o.customerPhone.replace(/\D/g, '') === lastPhone) {
        return true;
      }
    } catch {
      // ignore
    }

    return false;
  };

  // Strictly filter orders to display ONLY real orders belonging to this customer
  const userOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((o) => {
      // 1. Strict ownership filter
      if (!orderBelongsToUser(o)) return false;

      // 2. Search query matching
      if (query) {
        const matchesQuery =
          o.orderNumber.toLowerCase().includes(query) ||
          (o.customerPhone && o.customerPhone.replace(/\D/g, '').includes(query)) ||
          o.customerName.toLowerCase().includes(query) ||
          (o.courierName && o.courierName.toLowerCase().includes(query)) ||
          (o.trackingNumber && o.trackingNumber.toLowerCase().includes(query));

        if (!matchesQuery) return false;
      }

      // 3. Tab filtering
      if (activeTab === 'PENDING') {
        if (o.orderStatus !== 'PENDING_PAYMENT' && o.orderStatus !== 'PENDING_APPROVAL') {
          return false;
        }
      } else if (activeTab === 'PROCESSING') {
        if (o.orderStatus !== 'PROCESSING') return false;
      } else if (activeTab === 'SHIPPED') {
        if (o.orderStatus !== 'SHIPPED') return false;
      } else if (activeTab === 'COMPLETED') {
        if (o.orderStatus !== 'COMPLETED' && o.orderStatus !== 'DELIVERED') return false;
      }

      return true;
    });
  }, [orders, customers, currentUser, searchQuery, activeTab]);

  // Tab counts for quick overview
  const tabCounts = useMemo(() => {
    const myOrders = orders.filter((o) => orderBelongsToUser(o));

    return {
      all: myOrders.length,
      pending: myOrders.filter((o) => o.orderStatus === 'PENDING_PAYMENT' || o.orderStatus === 'PENDING_APPROVAL').length,
      processing: myOrders.filter((o) => o.orderStatus === 'PROCESSING').length,
      shipped: myOrders.filter((o) => o.orderStatus === 'SHIPPED').length,
      completed: myOrders.filter((o) => o.orderStatus === 'COMPLETED' || o.orderStatus === 'DELIVERED').length,
    };
  }, [orders, customers, currentUser]);

  // Handle customer confirming delivery / claim
  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingOrder) return;

    try {
      setIsConfirming(true);
      const updated = await orderRepo.confirmDeliveryByCustomer(
        confirmingOrder.id,
        customerNote.trim() || undefined
      );

      await refreshData();
      showToast(
        `Alhamdulillah! Anda telah mengklaim pesanan #${confirmingOrder.orderNumber} sudah diterima. Admin toko dapat mengklaim pesanan selesai.`,
        'success'
      );

      // Update active selection modal if open
      if (selectedOrder && selectedOrder.id === confirmingOrder.id) {
        setSelectedOrder(updated);
      }

      setConfirmingOrder(null);
      setCustomerNote('');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengklaim penerimaan barang', 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <Link
          to="/"
          className="text-xs font-medium text-stone-500 hover:text-stone-900 inline-flex items-center gap-1 mb-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Produk</span>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-emerald-700" />
              <span>Pesanan Saya</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Pantau status pesanan (diproses, dalam pengiriman, atau selesai), unduh struk transaksi, dan konfirmasi barang diterima
            </p>
          </div>

          <div className="text-xs text-stone-600 bg-white border border-stone-200 px-3.5 py-2 rounded-xl shadow-2xs flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span>
              Akun Pemesan: <strong className="text-stone-900">{currentUser?.name || 'Pelanggan'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Status Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ALL'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          <span>Semua Pesanan</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'ALL' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {tabCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SHIPPED')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'SHIPPED'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Dalam Pengiriman</span>
          {tabCounts.shipped > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'SHIPPED' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800 animate-pulse'
              }`}
            >
              {tabCounts.shipped}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PROCESSING')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'PROCESSING'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Diproses</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'PROCESSING' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {tabCounts.processing}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'COMPLETED'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <PackageCheck className="w-3.5 h-3.5" />
          <span>Selesai / Diterima</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'COMPLETED' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {tabCounts.completed}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'PENDING'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          <span>Menunggu Verifikasi</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'PENDING' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {tabCounts.pending}
          </span>
        </button>
      </div>

      {/* Search Bar for Orders */}
      <div className="mb-6 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
        <Search className="w-5 h-5 text-stone-400 shrink-0 ml-1" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari pesanan berdasarkan Nomor Pesanan (ORD-...), Nomor Resi, Kurir, atau Nomor HP..."
          className="w-full text-xs sm:text-sm text-stone-800 placeholder-stone-400 bg-transparent focus:outline-hidden"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded cursor-pointer"
          >
            Bersihkan
          </button>
        )}
      </div>

      {userOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto mb-3">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-stone-800 text-base">Belum Ada Riwayat Pesanan</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6">
            {searchQuery
              ? 'Tidak ditemukan pesanan yang sesuai dengan kata kunci pencarian Anda.'
              : activeTab !== 'ALL'
              ? `Tidak ada pesanan dengan status tab "${activeTab}". Silakan pilih tab "Semua Pesanan".`
              : 'Anda belum memiliki pesanan aktif di toko kami. Silakan pilih produk bibit atau pupuk/obat pertanian dan lakukan checkout.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition shadow-xs"
          >
            <Store className="w-4 h-4" />
            <span>Mulai Belanja Sekarang</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {userOrders.map((order) => {
            const isShipped = order.orderStatus === 'SHIPPED';
            const isDelivered = order.orderStatus === 'DELIVERED';
            const isCompleted = order.orderStatus === 'COMPLETED';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition ${
                  isShipped
                    ? 'border-blue-400 ring-2 ring-blue-100'
                    : isDelivered
                    ? 'border-teal-400 ring-2 ring-teal-100'
                    : 'border-stone-200 hover:border-emerald-300'
                }`}
              >
                {/* Top row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="font-mono font-bold text-xs sm:text-sm text-stone-900 bg-stone-100 px-2.5 py-1 rounded-md">
                      {order.orderNumber}
                    </div>
                    <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateIndo(order.createdAt)}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-800 border border-emerald-100">
                      Marketplace Online
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <PaymentStatusBadge status={order.paymentStatus} />
                    <OrderStatusBadge status={order.orderStatus} />
                  </div>
                </div>

                {/* Shipping & Delivery Alert Banner (Prominent in SHIPPED status) */}
                {isShipped && (
                  <div className="mt-3 p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Truck className="w-5 h-5 animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-blue-900 text-xs sm:text-sm">
                            Pesanan Anda Sedang Dalam Pengiriman!
                          </p>
                          <span className="bg-blue-200 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Aktif Dikirim
                          </span>
                        </div>
                        <div className="text-[11px] text-blue-800 mt-1 space-x-2">
                          <span>
                            Kurir: <strong>{order.courierName || 'Kurir Toko Tani Makmur'}</strong>
                          </span>
                          {order.trackingNumber && (
                            <>
                              <span>•</span>
                              <span>
                                Resi:{' '}
                                <strong className="font-mono bg-white px-2 py-0.5 rounded border border-blue-300 text-blue-950 font-bold select-all">
                                  {order.trackingNumber}
                                </strong>
                              </span>
                            </>
                          )}
                          {order.shippedAt && (
                            <>
                              <span>•</span>
                              <span>Dikirim: {formatDateIndo(order.shippedAt)}</span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-blue-700 mt-1">
                          Hanya Anda sebagai pembeli yang bisa mengklaim barang sudah diterima. Silakan klik tombol di samping saat paket sampai.
                        </p>
                      </div>
                    </div>

                    {/* Customer Confirm Delivery / Claim Button on Banner */}
                    <button
                      type="button"
                      onClick={() => setConfirmingOrder(order)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0 animate-pulse"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Klaim Pesanan Sudah Diterima</span>
                    </button>
                  </div>
                )}

                {/* Customer claimed delivery, waiting for admin completion */}
                {isDelivered && (
                  <div className="mt-3 p-3.5 rounded-xl bg-teal-50/90 border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-teal-950">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-teal-950 text-xs sm:text-sm">
                            Anda Telah Mengklaim Pesanan Diterima!
                          </p>
                          <span className="bg-teal-200 text-teal-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Klaim Diterima Sukses
                          </span>
                        </div>
                        <p className="text-[11px] text-teal-800 mt-1">
                          Barang telah Anda konfirmasi diterima{order.receivedByCustomerAt || order.deliveredAt ? ` pada ${formatDateIndo(order.receivedByCustomerAt || order.deliveredAt || '')}` : ''}.
                          Pihak admin toko akan mengklaim pesanan telah selesai secara resmi.
                        </p>
                      </div>
                    </div>
                    {order.customerNotes && (
                      <span className="text-[11px] text-teal-900 bg-white/90 px-2.5 py-1 rounded-lg border border-teal-200 italic shrink-0">
                        "{order.customerNotes}"
                      </span>
                    )}
                  </div>
                )}

                {/* Delivery Completed confirmation banner */}
                {isCompleted && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        <strong>Pesanan Telah Selesai:</strong> Barang sudah Anda terima dan transaksi telah diselesaikan oleh admin
                        {order.deliveredAt ? ` pada ${formatDateIndo(order.deliveredAt)}` : ''}.
                      </span>
                    </div>
                    {order.customerNotes && (
                      <span className="text-[11px] text-emerald-800 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 italic">
                        "{order.customerNotes}"
                      </span>
                    )}
                  </div>
                )}

                {/* Items row */}
                <div className="py-3 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-8 flex flex-col gap-2.5">
                    {order.items.map((item, idx) => (
                      <div key={`${item.productId}-${idx}`} className="flex items-center gap-3 text-xs">
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-12 h-12 rounded-xl object-cover bg-stone-100 border border-stone-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-stone-800 truncate text-xs sm:text-sm">
                            {item.productName}
                          </p>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            {item.quantity} x {formatRupiah(item.price)} ({item.unit})
                          </p>
                        </div>
                        <span className="font-bold text-stone-900 shrink-0 text-xs sm:text-sm">
                          {formatRupiah(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="md:col-span-4 flex flex-col md:items-end justify-between border-t md:border-t-0 md:border-l border-stone-100 pt-3 md:pt-0 md:pl-4">
                    <div className="text-right">
                      <span className="text-[11px] text-stone-400">Total Pembayaran:</span>
                      <div className="text-base sm:text-lg font-black text-emerald-800">
                        {formatRupiah(order.total)}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {order.items.reduce((sum, it) => sum + it.quantity, 0)} barang
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3 justify-end">
                      {/* Direct Confirm Delivery Button if order is SHIPPED */}
                      {isShipped && (
                        <button
                          type="button"
                          onClick={() => setConfirmingOrder(order)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer animate-pulse"
                          title="Klaim barang sudah Anda terima"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Klaim Pesanan Diterima</span>
                        </button>
                      )}

                      {isDelivered && (
                        <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Sudah Diklaim Diterima</span>
                        </span>
                      )}

                      {order.paymentProofUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewProofUrl(order.paymentProofUrl!)}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                          title="Lihat Bukti Transfer"
                        >
                          <FileImage className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Bukti Bayar</span>
                        </button>
                      )}

                      {/* Download / Print Receipt Button */}
                      <button
                        type="button"
                        onClick={() => setPrintingOrder(order)}
                        className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Unduh Struk (PDF/PNG) atau Cetak"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Unduh Struk</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Rincian</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rejection notice if any */}
                {order.orderStatus === 'REJECTED' && order.rejectionReason && (
                  <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    <strong>Catatan Penolakan Admin:</strong> {order.rejectionReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Customer Confirm Delivery / Claim */}
      {confirmingOrder && (
        <Modal
          isOpen={!!confirmingOrder}
          onClose={() => setConfirmingOrder(null)}
          title="Klaim Pesanan Sudah Diterima"
          maxWidth="md"
        >
          <form onSubmit={handleConfirmDelivery} className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <span>Klaim Penerimaan Barang oleh Pelanggan</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                Penyelesaian pesanan dimulai dari pihak pelanggan. Dengan mengonfirmasi ini, Anda mengklaim bahwa seluruh paket produk fisik telah Anda terima dengan baik. Setelah Anda mengklaim penerimaan barang, pihak admin toko akan mengklaim pesanan telah selesai secara final.
              </p>
            </div>

            {/* Order summary */}
            <div className="bg-white border border-stone-200 rounded-xl p-3 space-y-1.5 text-stone-700">
              <div className="flex justify-between font-mono font-bold text-stone-900">
                <span>No. Pesanan:</span>
                <span>{confirmingOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Ekspedisi Kurir:</span>
                <span className="font-semibold text-stone-800">
                  {confirmingOrder.courierName || 'Kurir Toko Tani Makmur'}
                </span>
              </div>
              {confirmingOrder.trackingNumber && (
                <div className="flex justify-between text-stone-500">
                  <span>Nomor Resi:</span>
                  <span className="font-mono font-bold text-stone-900">
                    {confirmingOrder.trackingNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-stone-500">
                <span>Total Belanja:</span>
                <span className="font-black text-emerald-800">
                  {formatRupiah(confirmingOrder.total)}
                </span>
              </div>
              <div className="border-t border-stone-100 pt-1.5 mt-1.5">
                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                  Produk yang Diterima:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-stone-700">
                  {confirmingOrder.items.map((it, idx) => (
                    <li key={idx} className="truncate">
                      {it.quantity} {it.unit} - {it.productName}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Optional Customer Note / Review */}
            <div>
              <label className="block font-semibold text-stone-800 mb-1">
                Catatan / Ulasan Penerimaan (Opsional):
              </label>
              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Contoh: Paket benih dan pupuk sampai dengan aman, kemasan rapi dan segel utuh. Terima kasih Kios Tani Makmur!"
                rows={3}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-hidden focus:border-emerald-600"
              />
            </div>

            <div className="pt-2 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingOrder(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isConfirming}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>{isConfirming ? 'Menyimpan Klaim...' : 'Ya, Saya Sudah Menerima Pesanan'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Detail Pesanan #${selectedOrder.orderNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center">
              <div>
                <span className="text-stone-500 text-[11px]">Status Pesanan:</span>
                <div className="mt-1 flex items-center gap-2">
                  <OrderStatusBadge status={selectedOrder.orderStatus} />
                  <PaymentStatusBadge status={selectedOrder.paymentStatus} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-stone-500 text-[11px]">Waktu Pemesanan:</span>
                <p className="font-semibold text-stone-800 mt-1">
                  {formatDateIndo(selectedOrder.createdAt)}
                </p>
              </div>
            </div>

            {/* Shipping Info Card in Detail Modal */}
            {(selectedOrder.courierName || selectedOrder.trackingNumber || selectedOrder.orderStatus === 'SHIPPED') && (
              <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2 text-blue-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Truck className="w-4 h-4 text-blue-700" />
                    <span>Informasi Ekspedisi Pengiriman</span>
                  </div>

                  {selectedOrder.orderStatus === 'SHIPPED' && (
                    <button
                      type="button"
                      onClick={() => setConfirmingOrder(selectedOrder)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Klaim Pesanan Sudah Diterima</span>
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'DELIVERED' && (
                    <span className="px-3 py-1.5 rounded-lg bg-teal-100 text-teal-900 font-bold text-xs inline-flex items-center gap-1.5 border border-teal-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                      <span>Sudah Diklaim Diterima</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-stone-500">Kurir Pengiriman: </span>
                    <strong className="text-stone-900">
                      {selectedOrder.courierName || 'Kurir Toko Tani Makmur'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-500">Nomor Resi: </span>
                    <strong className="font-mono text-blue-900 select-all font-bold">
                      {selectedOrder.trackingNumber || 'Dalam Proses Penyerahan'}
                    </strong>
                  </div>
                  {selectedOrder.shippedAt && (
                    <div>
                      <span className="text-stone-500">Tanggal Kirim: </span>
                      <span>{formatDateIndo(selectedOrder.shippedAt)}</span>
                    </div>
                  )}
                  {selectedOrder.deliveredAt && (
                    <div>
                      <span className="text-stone-500">Tanggal Diterima: </span>
                      <strong className="text-emerald-700">
                        {formatDateIndo(selectedOrder.deliveredAt)}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>Informasi Pembeli & Pengiriman</span>
              </h4>
              <div className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-1.5 text-stone-600">
                <p>
                  <strong>Penerima:</strong> {selectedOrder.customerName} ({selectedOrder.customerPhone})
                </p>
                <p>
                  <strong>Alamat Pengiriman:</strong> {selectedOrder.customerAddress || 'Ambil di Toko'}
                </p>
                <p>
                  <strong>Metode Pembayaran:</strong> {selectedOrder.paymentBank || selectedOrder.paymentMethod}
                </p>
                {selectedOrder.notes && (
                  <p>
                    <strong>Catatan:</strong> {selectedOrder.notes}
                  </p>
                )}
                {selectedOrder.customerNotes && (
                  <p className="text-emerald-800">
                    <strong>Catatan Penerimaan Pembeli:</strong> {selectedOrder.customerNotes}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-700" />
                <span>Rincian Produk ({selectedOrder.items.length} Macam)</span>
              </h4>
              <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden bg-white">
                {selectedOrder.items.map((it, idx) => (
                  <div key={`${it.productId}-${idx}`} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={it.imageUrl}
                        alt={it.productName}
                        className="w-10 h-10 rounded-lg object-cover bg-stone-100 border border-stone-200 shrink-0"
                      />
                      <div>
                        <div className="font-semibold text-stone-900">{it.productName}</div>
                        <div className="text-[11px] text-stone-500">
                          {it.quantity} {it.unit} x {formatRupiah(it.price)}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-stone-900">{formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 space-y-1 text-right">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal Barang:</span>
                <span>{formatRupiah(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.shippingCost > 0 && (
                <div className="flex justify-between text-stone-500">
                  <span>Ongkos Kirim:</span>
                  <span>{formatRupiah(selectedOrder.shippingCost)}</span>
                </div>
              )}
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-1.5 border-t border-stone-100">
                <span>Total Pembayaran:</span>
                <span className="text-emerald-800 font-black text-base">
                  {formatRupiah(selectedOrder.total)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex flex-wrap justify-end gap-2">
              {/* If SHIPPED, show confirm received button inside modal footer as well */}
              {selectedOrder.orderStatus === 'SHIPPED' && (
                <button
                  type="button"
                  onClick={() => setConfirmingOrder(selectedOrder)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Klaim Pesanan Sudah Diterima</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setPrintingOrder(selectedOrder)}
                className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Unduh & Cetak Struk (PDF/PNG)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={!!printingOrder}
        onClose={() => setPrintingOrder(null)}
        order={printingOrder}
      />

      {/* Proof Preview Modal */}
      {previewProofUrl && (
        <Modal
          isOpen={!!previewProofUrl}
          onClose={() => setPreviewProofUrl(null)}
          title="Bukti Pembayaran / Transfer"
          maxWidth="md"
        >
          <div className="text-center">
            <img
              src={previewProofUrl}
              alt="Bukti Transfer"
              className="max-h-[65vh] mx-auto rounded-lg object-contain shadow-xs border border-stone-200"
            />
            <p className="text-xs text-stone-500 mt-3">
              Foto bukti transfer / struk pembayaran yang diunggah saat pemesanan.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
