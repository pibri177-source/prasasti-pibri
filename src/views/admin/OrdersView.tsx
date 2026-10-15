import React, { useState, useMemo } from 'react';
import { useApp, formatRupiah, formatDateIndo } from '../../context/AppContext';
import { orderRepo } from '../../services/db';
import { Order, OrderStatus } from '../../types';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Modal } from '../../components/common/Modal';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import {
  ClipboardList,
  Search,
  Eye,
  Calendar,
  Truck,
  CheckCircle,
  FileText,
  Printer,
  ChevronDown,
  Edit3,
  PackageCheck,
  Send,
  AlertCircle,
  MapPin,
  Check,
  Clock,
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { orders, refreshData, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // Status & Shipping update modal state
  const [shippingModalOrder, setShippingModalOrder] = useState<Order | null>(null);
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('SHIPPED');
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.orderStatus !== statusFilter) return false;
      if (channelFilter !== 'ALL' && o.type !== channelFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q) ||
          (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [orders, statusFilter, channelFilter, searchQuery]);

  // Open modal to update shipping / status
  const openShippingModal = (order: Order, defaultStatus?: OrderStatus) => {
    setShippingModalOrder(order);
    if (defaultStatus) {
      setTargetStatus(defaultStatus);
    } else if (order.orderStatus === 'DELIVERED') {
      setTargetStatus('COMPLETED');
    } else if (order.orderStatus === 'PROCESSING') {
      setTargetStatus('SHIPPED');
    } else {
      setTargetStatus(order.orderStatus);
    }
    setCourierName(order.courierName || 'Kurir Toko Tani Makmur');
    setTrackingNumber(order.trackingNumber || '');
    setShippingNotes(order.notes || '');
  };

  // Submit shipping / status update
  const handleSaveShippingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingModalOrder) return;

    if (
      targetStatus === 'COMPLETED' &&
      shippingModalOrder.type === 'MARKETPLACE' &&
      shippingModalOrder.orderStatus !== 'DELIVERED' &&
      !shippingModalOrder.customerReceivedClaimed
    ) {
      showToast(
        'Pesanan belum dapat diselesaikan: Pihak pelanggan harus mengklaim penerimaan barang terlebih dahulu.',
        'error'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await orderRepo.updateStatus(shippingModalOrder.id, targetStatus, {
        courierName: courierName.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        notes: shippingNotes.trim() || undefined,
      });

      await refreshData();

      // Update active selection if open
      if (selectedOrder && selectedOrder.id === shippingModalOrder.id) {
        setSelectedOrder(updated);
      }

      showToast(`Pesanan #${updated.orderNumber} berhasil diperbarui menjadi ${targetStatus}!`, 'success');
      setShippingModalOrder(null);
    } catch (err) {
      console.error(err);
      showToast('Gagal memperbarui status pesanan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin claims order as completed AFTER customer has received & claimed the order
  const handleAdminClaimCompleted = async (order: Order) => {
    try {
      const updated = await orderRepo.claimCompletedByAdmin(order.id);
      await refreshData();
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(updated);
      }
      showToast(`Pesanan #${order.orderNumber} berhasil diklaim & diselesaikan oleh Admin!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyelesaikan pesanan', 'error');
    }
  };

  // Quick mark as approved
  const handleQuickApprove = async (order: Order) => {
    try {
      await orderRepo.updateApproval(order.id, 'APPROVE');
      await refreshData();
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, orderStatus: 'PROCESSING', paymentStatus: 'PAID' } : null
        );
      }
      showToast(`Pembayaran #${order.orderNumber} disetujui! Status: Diproses`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyetujui pembayaran', 'error');
    }
  };

  return (
    <div className="flex-1 min-w-0 bg-stone-50 min-h-screen">
      <AdminHeader
        title="Kelola Pesanan & Riwayat Transaksi"
        subtitle="Daftar seluruh transaksi masuk dari kasir counter toko dan marketplace online"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Filter controls */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no. pesanan, resi, nama pelanggan, kontak..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-stone-50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold border border-stone-200 rounded-xl px-3 py-2 bg-stone-50 text-stone-800 focus:outline-hidden"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING_APPROVAL">Perlu Approval</option>
              <option value="PROCESSING">Diproses</option>
              <option value="SHIPPED">Dalam Pengiriman</option>
              <option value="DELIVERED">Diterima Pelanggan (Perlu Klaim Admin)</option>
              <option value="COMPLETED">Selesai</option>
              <option value="REJECTED">Ditolak</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="text-xs font-semibold border border-stone-200 rounded-xl px-3 py-2 bg-stone-50 text-stone-800 focus:outline-hidden"
            >
              <option value="ALL">Semua Channel</option>
              <option value="MARKETPLACE">Marketplace</option>
              <option value="POS">Kasir Toko (POS)</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">No. Pesanan</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Pengiriman</th>
                  <th className="py-3 px-4 text-right">Total Tagihan</th>
                  <th className="py-3 px-4">Status Pesanan</th>
                  <th className="py-3 px-4 text-right">Aksi & Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-400">
                      Tidak ada pesanan yang sesuai dengan filter
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">
                        {ord.orderNumber}
                      </td>

                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                        {formatDateIndo(ord.createdAt)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{ord.customerName}</div>
                        <div className="text-[11px] text-stone-400">{ord.customerPhone}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700">
                          {ord.type === 'POS' ? 'Kasir Toko' : 'Marketplace'}
                        </span>
                      </td>

                      {/* Shipping info in table */}
                      <td className="py-3 px-4">
                        {ord.type === 'POS' ? (
                          <span className="text-[11px] text-stone-400">Ambil di Counter</span>
                        ) : ord.trackingNumber ? (
                          <div className="text-[11px] leading-tight">
                            <span className="font-semibold text-blue-700 block">
                              {ord.courierName || 'Kurir Toko'}
                            </span>
                            <span className="font-mono text-stone-500 select-all">
                              Resi: {ord.trackingNumber}
                            </span>
                          </div>
                        ) : ord.orderStatus === 'PROCESSING' ? (
                          <span className="text-[11px] text-amber-600 font-medium">
                            Siap Dikirim
                          </span>
                        ) : ord.orderStatus === 'DELIVERED' ? (
                          <div className="text-[11px] leading-tight">
                            <span className="text-teal-700 font-bold block">
                              Diterima Pelanggan
                            </span>
                            <span className="text-stone-400 text-[10px]">
                              Menunggu Klaim Admin
                            </span>
                          </div>
                        ) : ord.orderStatus === 'COMPLETED' ? (
                          <span className="text-[11px] text-emerald-600 font-medium">
                            Pesanan Selesai
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-emerald-800 whitespace-nowrap">
                        {formatRupiah(ord.total)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <OrderStatusBadge status={ord.orderStatus} />
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Quick workflow actions */}
                          {ord.type === 'MARKETPLACE' && ord.orderStatus === 'PENDING_APPROVAL' && (
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(ord)}
                              className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] inline-flex items-center gap-1 transition shadow-xs"
                              title="Setujui Pembayaran"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Setujui</span>
                            </button>
                          )}

                          {ord.type === 'MARKETPLACE' && ord.orderStatus === 'PROCESSING' && (
                            <button
                              type="button"
                              onClick={() => openShippingModal(ord, 'SHIPPED')}
                              className="px-2 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] inline-flex items-center gap-1 transition shadow-xs"
                              title="Kirim Pesanan & Masukkan Resi"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Kirim</span>
                            </button>
                          )}

                          {ord.type === 'MARKETPLACE' && ord.orderStatus === 'SHIPPED' && (
                            <span
                              className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px] inline-flex items-center gap-1 cursor-help"
                              title="Pesanan sedang dikirim. Pihak pelanggan yang berhak mengklaim bahwa pesanan sudah diterima."
                            >
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Menunggu Klaim Pembeli</span>
                            </span>
                          )}

                          {ord.type === 'MARKETPLACE' && ord.orderStatus === 'DELIVERED' && (
                            <button
                              type="button"
                              onClick={() => handleAdminClaimCompleted(ord)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] inline-flex items-center gap-1.5 transition shadow-xs animate-pulse"
                              title="Pelanggan telah mengklaim barang diterima. Klik untuk mengklaim pesanan selesai."
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Klaim Selesai</span>
                            </button>
                          )}

                          {ord.type === 'POS' && ord.orderStatus !== 'COMPLETED' && (
                            <button
                              type="button"
                              onClick={() => handleAdminClaimCompleted(ord)}
                              className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] inline-flex items-center gap-1 transition shadow-xs"
                              title="Selesaikan Transaksi Kasir"
                            >
                              <PackageCheck className="w-3 h-3" />
                              <span>Selesai</span>
                            </button>
                          )}

                          {/* Edit status button */}
                          <button
                            type="button"
                            onClick={() => openShippingModal(ord)}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition"
                            title="Perbarui Status & Ekspedisi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Print / Download Receipt */}
                          <button
                            type="button"
                            onClick={() => setPrintingOrder(ord)}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs transition"
                            title="Cetak & Unduh Struk (PDF/PNG)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs inline-flex items-center gap-1 transition"
                            title="Lihat Detail Pesanan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Rincian</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal: Update Status & Pengiriman (Dikirim / Diterima / Diproses) */}
      {shippingModalOrder && (
        <Modal
          isOpen={!!shippingModalOrder}
          onClose={() => setShippingModalOrder(null)}
          title={`Update Status Pesanan #${shippingModalOrder.orderNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveShippingUpdate} className="space-y-4 text-xs">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
              <div className="flex justify-between font-bold text-stone-900">
                <span>Pelanggan:</span>
                <span>{shippingModalOrder.customerName}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Total Belanja:</span>
                <span className="text-emerald-800 font-extrabold">
                  {formatRupiah(shippingModalOrder.total)}
                </span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Alamat Kirim:</span>
                <span className="text-stone-800 text-right max-w-xs truncate">
                  {shippingModalOrder.customerAddress || 'Ambil di Counter Toko'}
                </span>
              </div>
            </div>

            {/* Target status selector */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">
                Ubah Status Pesanan Menjadi:
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
                className="w-full text-xs font-semibold border border-stone-300 rounded-xl px-3 py-2 bg-white text-stone-900 focus:outline-hidden focus:border-emerald-600"
              >
                <option value="PROCESSING">Diproses (Sedang Dikemas / Menunggu Kirim)</option>
                <option value="SHIPPED">Dikirim (Pesanan Sedang Dalam Pengantaran)</option>
                {shippingModalOrder.orderStatus === 'DELIVERED' || shippingModalOrder.customerReceivedClaimed || shippingModalOrder.type === 'POS' ? (
                  <option value="COMPLETED">Selesai (Klaim Pesanan Telah Selesai)</option>
                ) : (
                  <option value="COMPLETED" disabled>
                    Selesai (Terkunci: Pelanggan Belum Mengklaim Diterima)
                  </option>
                )}
                <option value="PENDING_APPROVAL">Perlu Approval (Verifikasi Bukti Transfer)</option>
                <option value="CANCELLED">Dibatalkan (Stok Dikembalikan)</option>
              </select>

              {shippingModalOrder.type === 'MARKETPLACE' && shippingModalOrder.orderStatus === 'SHIPPED' && !shippingModalOrder.customerReceivedClaimed && (
                <div className="mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Info Hak Penyelesaian: </span>
                    Pelanggan yang berhak mengklaim bahwa pesanan sudah diterima. Setelah pelanggan mengklaim barang diterima, admin baru dapat mengklaim pesanan telah selesai.
                  </div>
                </div>
              )}

              {shippingModalOrder.type === 'MARKETPLACE' && (shippingModalOrder.orderStatus === 'DELIVERED' || shippingModalOrder.customerReceivedClaimed) && (
                <div className="mt-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Pelanggan telah mengklaim barang diterima! </span>
                    Silakan pilih status <strong>Selesai</strong> dan simpan untuk mengklaim pesanan telah selesai secara resmi.
                  </div>
                </div>
              )}
            </div>

            {/* Shipping details (Courier & Tracking Number) */}
            <div className="space-y-3 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                <Truck className="w-4 h-4 text-blue-700" />
                <span>Informasi Ekspedisi & Nomor Resi</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Nama Ekspedisi / Kurir Pengiriman:
                </label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="Contoh: Kurir Toko Tani Makmur, J&T Express, SiCepat, JNE"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-hidden focus:border-blue-600"
                />

                {/* Courier suggestion chips */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[
                    'Kurir Toko Tani Makmur',
                    'J&T Express',
                    'SiCepat',
                    'JNE OKE/REG',
                    'Anteraja',
                    'Ambil di Toko',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCourierName(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                        courierName === preset
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-blue-400'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Nomor Resi Pengiriman / Surat Jalan:
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Contoh: TM-KIRIM-8821 atau JP0987654321"
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-stone-300 rounded-xl bg-white focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Catatan Pengiriman / Tambahan:
                </label>
                <input
                  type="text"
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                  placeholder="Contoh: Paket diserahkan ke kurir jemputan pukul 14:00"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-hidden focus:border-blue-600"
                />
              </div>
            </div>

            {targetStatus === 'COMPLETED' && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-700 mt-0.5" />
                <span>
                  Menandai pesanan sebagai <strong>Selesai</strong> berarti produk telah diterima
                  dengan baik oleh pembeli. Tanggal konfirmasi akan dicatat otomatis.
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShippingModalOrder(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <SaveIcon className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
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
            {/* Status change actions */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-stone-500 text-[11px]">Status Pesanan Saat Ini:</span>
                <div className="mt-1 flex items-center gap-2">
                  <OrderStatusBadge status={selectedOrder.orderStatus} />
                  <PaymentStatusBadge status={selectedOrder.paymentStatus} />
                </div>
              </div>

              {selectedOrder.type === 'MARKETPLACE' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedOrder.orderStatus === 'PENDING_APPROVAL' && (
                    <button
                      type="button"
                      onClick={() => handleQuickApprove(selectedOrder)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Setujui Pembayaran</span>
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'PROCESSING' && (
                    <button
                      type="button"
                      onClick={() => openShippingModal(selectedOrder, 'SHIPPED')}
                      className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold transition flex items-center gap-1 shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Kirim Pesanan (Input Resi)</span>
                    </button>
                  )}

                  {selectedOrder.orderStatus === 'SHIPPED' && (
                    <span
                      className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1.5"
                      title="Pesanan sedang dikirim. Menunggu pelanggan mengklaim penerimaan barang."
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Menunggu Klaim Pembeli</span>
                    </span>
                  )}

                  {selectedOrder.orderStatus === 'DELIVERED' && (
                    <button
                      type="button"
                      onClick={() => handleAdminClaimCompleted(selectedOrder)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition flex items-center gap-1.5 shadow-sm animate-pulse"
                      title="Pelanggan sudah mengklaim barang diterima. Klik untuk mengklaim pesanan selesai."
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Klaim Pesanan Telah Selesai</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openShippingModal(selectedOrder)}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-200 text-stone-700 font-semibold transition flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ubah Status & Ekspedisi</span>
                  </button>
                </div>
              )}
            </div>

            {/* Shipping details banner if available */}
            {(selectedOrder.trackingNumber || selectedOrder.courierName || selectedOrder.deliveredAt) && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-1.5 text-blue-900">
                <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                  <Truck className="w-4 h-4 text-blue-700" />
                  <span>Status Pengiriman & Ekspedisi</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-stone-500">Ekspedisi: </span>
                    <strong className="text-stone-900">
                      {selectedOrder.courierName || 'Kurir Toko'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-500">Nomor Resi: </span>
                    <strong className="font-mono text-blue-800 select-all">
                      {selectedOrder.trackingNumber || '-'}
                    </strong>
                  </div>
                  {selectedOrder.shippedAt && (
                    <div>
                      <span className="text-stone-500">Waktu Dikirim: </span>
                      <span>{formatDateIndo(selectedOrder.shippedAt)}</span>
                    </div>
                  )}
                  {selectedOrder.deliveredAt && (
                    <div>
                      <span className="text-stone-500">Waktu Diterima: </span>
                      <strong className="text-emerald-700">
                        {formatDateIndo(selectedOrder.deliveredAt)}
                      </strong>
                    </div>
                  )}
                </div>

                {selectedOrder.customerNotes && (
                  <div className="mt-2 pt-2 border-t border-blue-200 text-[11px] text-stone-700">
                    <span className="font-semibold text-emerald-800">
                      Konfirmasi Pelanggan:
                    </span>{' '}
                    {selectedOrder.customerNotes}
                  </div>
                )}
              </div>
            )}

            {/* Buyer Details */}
            <div className="bg-white border border-stone-200 rounded-xl p-3 space-y-1.5 text-stone-600">
              <h4 className="font-bold text-stone-900 mb-1">Informasi Pembeli & Tujuan</h4>
              <p>
                <strong>Nama:</strong> {selectedOrder.customerName}
              </p>
              <p>
                <strong>No. Telepon:</strong> {selectedOrder.customerPhone}
              </p>
              <p>
                <strong>Alamat:</strong> {selectedOrder.customerAddress || 'Ambil di Toko'}
              </p>
              <p>
                <strong>Metode Bayar:</strong> {selectedOrder.paymentBank || selectedOrder.paymentMethod}
              </p>
              {selectedOrder.notes && (
                <p>
                  <strong>Catatan Pesanan:</strong> {selectedOrder.notes}
                </p>
              )}
            </div>

            {/* Items Table */}
            <div>
              <h4 className="font-bold text-stone-900 mb-2">Item Barang yang Dipesan</h4>
              <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden">
                {selectedOrder.items.map((it) => (
                  <div key={it.productId} className="p-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-stone-900">{it.productName}</p>
                      <p className="text-[11px] text-stone-500">
                        {it.quantity} x {formatRupiah(it.price)} ({it.unit})
                      </p>
                    </div>
                    <span className="font-bold text-stone-900">{formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial summary */}
            <div className="pt-2 border-t border-stone-200 space-y-1 text-right">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal:</span>
                <span>{formatRupiah(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.shippingCost > 0 && (
                <div className="flex justify-between text-stone-500">
                  <span>Ongkir:</span>
                  <span>{formatRupiah(selectedOrder.shippingCost)}</span>
                </div>
              )}
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-stone-900 pt-1 border-t border-stone-200">
                <span>Total:</span>
                <span className="text-emerald-800">{formatRupiah(selectedOrder.total)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrintingOrder(selectedOrder)}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak & Unduh Struk (PDF/PNG)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50 cursor-pointer"
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
    </div>
  );
};

function SaveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
