import React, { useState, useMemo } from 'react';
import { useApp, formatRupiah, formatDateIndo } from '../../context/AppContext';
import { orderRepo } from '../../services/db';
import { Order } from '../../types';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Modal } from '../../components/common/Modal';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import {
  CheckCircle2,
  XCircle,
  Eye,
  FileImage,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  User,
  Phone,
  Calendar,
  Search,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Printer,
} from 'lucide-react';

export const PaymentApprovalView: React.FC = () => {
  const { orders, refreshData, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [selectedProofOrder, setSelectedProofOrder] = useState<Order | null>(null);
  const [approvingOrder, setApprovingOrder] = useState<Order | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // Filter orders
  const pendingOrders = useMemo(() => {
    return orders.filter(
      (o) => o.orderStatus === 'PENDING_APPROVAL' || o.paymentStatus === 'WAITING_APPROVAL'
    );
  }, [orders]);

  const historyOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.paymentProofUrl || o.paymentStatus === 'PAID' || o.paymentStatus === 'REJECTED') &&
        o.orderStatus !== 'PENDING_APPROVAL' &&
        o.paymentStatus !== 'WAITING_APPROVAL'
    );
  }, [orders]);

  const currentList = useMemo(() => {
    const list = activeTab === 'PENDING' ? pendingOrders : historyOrders;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q)
    );
  }, [activeTab, pendingOrders, historyOrders, searchQuery]);

  // Execute Approval
  const executeApprove = async (order: Order) => {
    setIsProcessing(true);
    try {
      await orderRepo.updateApproval(order.id, 'APPROVE');
      await refreshData();
      showToast(
        `Pembayaran pesanan #${order.orderNumber} berhasil disetujui! Status: Siap Dikemas.`,
        'success'
      );
      setApprovingOrder(null);
      if (selectedProofOrder?.id === order.id) {
        setSelectedProofOrder(null);
      }
    } catch (err) {
      console.error('Error approving order:', err);
      showToast('Gagal menyetujui pembayaran. Terjadi kesalahan pada penyimpanan.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Rejection
  const executeReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingOrder) return;

    setIsProcessing(true);
    try {
      const reason =
        rejectionReason.trim() || 'Bukti transfer tidak valid atau dana belum masuk ke mutasi bank.';
      await orderRepo.updateApproval(rejectingOrder.id, 'REJECT', reason);
      await refreshData();
      showToast(
        `Pembayaran #${rejectingOrder.orderNumber} ditolak. Stok barang telah dikembalikan.`,
        'info'
      );
      setRejectingOrder(null);
      setRejectionReason('');
      if (selectedProofOrder?.id === rejectingOrder.id) {
        setSelectedProofOrder(null);
      }
    } catch (err) {
      console.error('Error rejecting order:', err);
      showToast('Gagal menolak pembayaran', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 bg-stone-50 min-h-screen">
      <AdminHeader
        title="Approval Pembayaran Marketplace"
        subtitle="Verifikasi bukti transfer / mutasi bank pelanggan online, approve pesanan atau tolak dengan alasan"
      />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'PENDING'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs'
                  : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Clock className="w-4 h-4 text-rose-600" />
              <span>Menunggu Approval ({pendingOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'HISTORY'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Riwayat Verifikasi ({historyOrders.length})</span>
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no pesanan / pelanggan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Empty State */}
        {currentList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md mx-auto">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="font-bold text-stone-900 text-sm">
              {activeTab === 'PENDING'
                ? 'Semua Pembayaran Telah Disetujui!'
                : 'Belum Ada Riwayat Approval'}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              {activeTab === 'PENDING'
                ? 'Tidak ada antrean bukti transfer yang menunggu verifikasi saat ini.'
                : 'Riwayat persetujuan atau penolakan bukti bayar akan muncul di sini.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {currentList.map((order) => {
              const isPending =
                order.orderStatus === 'PENDING_APPROVAL' ||
                order.paymentStatus === 'WAITING_APPROVAL';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <div>
                        <span className="font-mono font-bold text-sm text-stone-900">
                          {order.orderNumber}
                        </span>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDateIndo(order.createdAt)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <PaymentStatusBadge status={order.paymentStatus} />
                        <OrderStatusBadge status={order.orderStatus} />
                      </div>
                    </div>

                    {/* Customer and Bank Info */}
                    <div className="py-3 grid grid-cols-2 gap-3 text-xs text-stone-600 border-b border-stone-100">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-semibold">
                          Nama Pembeli:
                        </span>
                        <p className="font-bold text-stone-900 mt-0.5">{order.customerName}</p>
                        <p className="text-[11px] text-stone-500">{order.customerPhone}</p>
                        {order.customerAddress && (
                          <p className="text-[11px] text-stone-400 truncate max-w-[200px] mt-0.5">
                            {order.customerAddress}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-semibold">
                          Tujuan Pembayaran:
                        </span>
                        <p className="font-bold text-stone-900 mt-0.5">
                          {order.paymentBank || 'Transfer Bank'}
                        </p>
                        <p className="text-[12px] text-emerald-800 font-black mt-1">
                          Nominal: {formatRupiah(order.total)}
                        </p>
                      </div>
                    </div>

                    {/* Items List Preview */}
                    <div className="py-3">
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-1.5">
                        Item yang Dipesan ({order.items.length} macam barang):
                      </span>
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {order.items.map((it) => (
                          <div
                            key={it.productId}
                            className="flex items-center justify-between text-xs text-stone-700 bg-stone-50 p-2 rounded-lg"
                          >
                            <span className="font-medium truncate max-w-[220px]">
                              {it.productName}
                            </span>
                            <span className="font-bold shrink-0">
                              {it.quantity} x {formatRupiah(it.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Proof Thumbnail View */}
                    <div className="py-3 border-t border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {order.paymentProofUrl ? (
                          <img
                            src={order.paymentProofUrl}
                            alt="Slip Transfer"
                            onClick={() => setSelectedProofOrder(order)}
                            className="w-14 h-14 rounded-lg object-cover border border-stone-200 cursor-pointer hover:opacity-85 transition shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 text-xs">
                            No Slip
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-stone-900">
                            {order.paymentProofUrl ? 'Bukti Transfer Dilampirkan' : 'Belum Ada Bukti'}
                          </p>
                          <p className="text-[11px] text-stone-500">
                            Klik tombol untuk melihat detail slip
                          </p>
                        </div>
                      </div>

                      {order.paymentProofUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedProofOrder(order)}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-medium flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Lihat Bukti</span>
                        </button>
                      )}
                    </div>

                    {/* Rejection Note */}
                    {order.rejectionReason && (
                      <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                        <strong>Catatan Penolakan:</strong> {order.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isPending ? (
                    <div className="mt-4 pt-3 border-t border-stone-100 flex gap-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setRejectingOrder(order)}
                        className="flex-1 py-2.5 px-3 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Tolak Pembayaran</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setApprovingOrder(order)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Setujui (Approve)</span>
                      </button>
                    </div>
                  ) : order.paymentStatus === 'PAID' ? (
                    <div className="mt-4 pt-3 border-t border-stone-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPrintingOrder(order)}
                        className="py-2 px-3 rounded-xl border border-stone-200 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Cetak Struk Pembayaran</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation Modal for Approving (NO window.confirm!) */}
      {approvingOrder && (
        <Modal
          isOpen={!!approvingOrder}
          onClose={() => setApprovingOrder(null)}
          title={`Konfirmasi Persetujuan Pembayaran #${approvingOrder.orderNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-sm mb-1 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Persetujuan Pembayaran</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                Apakah Anda yakin telah memverifikasi mutasi rekening dan ingin menyetujui transaksi
                ini? Status pesanan akan otomatis berubah menjadi <strong>Diproses (Siap Dikemas)</strong> dan dicatat ke laporan keuangan.
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-1.5 text-stone-700">
              <div className="flex justify-between">
                <span className="text-stone-500">Nomor Pesanan:</span>
                <span className="font-mono font-bold text-stone-900">
                  {approvingOrder.orderNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Pelanggan:</span>
                <span className="font-semibold text-stone-900">{approvingOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Tujuan Bank/QRIS:</span>
                <span className="font-semibold text-stone-900">
                  {approvingOrder.paymentBank || 'Transfer Bank'}
                </span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-1 text-sm font-bold text-stone-900">
                <span>Total Dana Diterima:</span>
                <span className="text-emerald-800 font-black">
                  {formatRupiah(approvingOrder.total)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setApprovingOrder(null)}
                disabled={isProcessing}
                className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeApprove(approvingOrder)}
                disabled={isProcessing}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ya, Setujui Pembayaran</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Proof Fullscreen Preview Modal with Quick Approve Button */}
      {selectedProofOrder && (
        <Modal
          isOpen={!!selectedProofOrder}
          onClose={() => setSelectedProofOrder(null)}
          title={`Bukti Transfer: ${selectedProofOrder.orderNumber} (${selectedProofOrder.customerName})`}
          maxWidth="lg"
        >
          <div className="text-center space-y-4">
            {selectedProofOrder.paymentProofUrl && (
              <img
                src={selectedProofOrder.paymentProofUrl}
                alt="Bukti Transfer Penuh"
                className="max-h-[60vh] mx-auto rounded-xl object-contain border border-stone-200 shadow-md bg-stone-50"
              />
            )}

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-left grid grid-cols-2 gap-2">
              <div>
                <span className="text-stone-400">Total Tagihan:</span>
                <p className="font-black text-emerald-800 text-sm">
                  {formatRupiah(selectedProofOrder.total)}
                </p>
              </div>
              <div>
                <span className="text-stone-400">Metode:</span>
                <p className="font-bold text-stone-900">{selectedProofOrder.paymentBank}</p>
              </div>
            </div>

            {/* Quick Actions if pending */}
            {(selectedProofOrder.orderStatus === 'PENDING_APPROVAL' ||
              selectedProofOrder.paymentStatus === 'WAITING_APPROVAL') && (
              <div className="flex gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingOrder(selectedProofOrder);
                  }}
                  className="flex-1 py-2 px-3 border border-rose-300 text-rose-700 font-bold text-xs rounded-lg hover:bg-rose-50"
                >
                  Tolak Bukti Bayar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    executeApprove(selectedProofOrder);
                  }}
                  disabled={isProcessing}
                  className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Setujui Pembayaran Sekarang</span>
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Rejection Modal with Preset Reasons */}
      {rejectingOrder && (
        <Modal
          isOpen={!!rejectingOrder}
          onClose={() => setRejectingOrder(null)}
          title={`Tolak Pembayaran Pesanan #${rejectingOrder.orderNumber}`}
          maxWidth="md"
        >
          <form onSubmit={executeReject} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Pengembalian Stok Otomatis</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Menolak pembayaran akan otomatis mengembalikan stok barang ke katalog dan memberi
                catatan kepada pembeli di menu <em>Pesanan Saya</em>.
              </p>
            </div>

            {/* Preset reasons */}
            <div>
              <label className="block font-semibold text-stone-800 mb-1.5">
                Pilih Alasan Cepat:
              </label>
              <div className="space-y-1.5 mb-2">
                {[
                  'Foto bukti transfer buram atau tidak terbaca',
                  'Nominal transfer tidak sesuai dengan total belanja',
                  'Dana belum masuk ke mutasi rekening bank toko',
                  'Nama pengirim tidak sesuai dengan nomor rekening',
                ].map((reasonText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReason(reasonText)}
                    className={`w-full text-left p-2 rounded-lg border text-[11px] transition ${
                      rejectionReason === reasonText
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    • {reasonText}
                  </button>
                ))}
              </div>

              <label className="block font-semibold text-stone-800 mb-1">
                Atau Tulis Catatan Khusus untuk Petani:
              </label>
              <textarea
                rows={2}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan..."
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {isProcessing ? 'Memproses...' : 'Konfirmasi Tolak Pembayaran'}
              </button>
            </div>
          </form>
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
