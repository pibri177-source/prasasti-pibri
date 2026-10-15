import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Order } from '../../types';
import { formatRupiah, formatDateIndo, useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from './Modal';
import {
  Printer,
  Copy,
  Download,
  Check,
  FileDown,
  Image as ImageIcon,
  Loader2,
  Truck,
  CheckCircle2,
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, order }) => {
  const { showToast } = useApp();
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);

  if (!order) return null;

  const totalItemsCount = order.items.reduce((s, it) => s + it.quantity, 0);

  // Generate plain text receipt for copying or saving
  const generateReceiptText = (): string => {
    const divider = '========================================\n';
    const dashed = '----------------------------------------\n';

    let text = '';
    text += '          KIOS TANI MAKMUR UMKM         \n';
    text += '   Sarana Obat Hama & Benih Pertanian   \n';
    text += '  Pasar Agrobisnis No. 12, Karawang     \n';
    text += '       Hotline: 0812-3456-7890          \n';
    text += divider;
    text += `No. Struk : ${order.orderNumber}\n`;
    text += `Tanggal   : ${formatDateIndo(order.createdAt)}\n`;
    text += `Kasir/Adm : ${currentUser?.name || 'Kasir Kios'}\n`;
    text += `Pelanggan : ${order.customerName}\n`;
    if (order.customerPhone && order.customerPhone !== '-') {
      text += `No. HP    : ${order.customerPhone}\n`;
    }
    text += `Channel   : ${order.type === 'POS' ? 'Kasir Counter Toko' : 'Marketplace Online'}\n`;
    if (order.courierName) {
      text += `Kurir     : ${order.courierName}\n`;
    }
    if (order.trackingNumber) {
      text += `No. Resi  : ${order.trackingNumber}\n`;
    }
    if (order.voucherCode) {
      text += `Voucher   : ${order.voucherCode}\n`;
    }
    text += dashed;
    text += 'DAFTAR PEMBELIAN:\n';

    order.items.forEach((it, idx) => {
      text += `${idx + 1}. ${it.productName}\n`;
      text += `   ${it.quantity} ${it.unit} x ${formatRupiah(it.price)} = ${formatRupiah(it.subtotal)}\n`;
    });

    text += dashed;
    text += `Subtotal (${totalItemsCount} item) : ${formatRupiah(order.subtotal)}\n`;
    if (order.voucherBreakdown && order.voucherBreakdown.length > 0) {
      order.voucherBreakdown.forEach((vb) => {
        text += `  * ${vb.label} : -${formatRupiah(vb.amount)}\n`;
      });
    } else if (order.discount > 0) {
      text += `Potongan Diskon : -${formatRupiah(order.discount)}\n`;
    }
    if (order.shippingCost > 0) {
      text += `Biaya Pengiriman: ${formatRupiah(order.shippingCost)}\n`;
    }
    text += `TOTAL TAGIHAN   : ${formatRupiah(order.total)}\n`;
    text += dashed;
    text += `Metode Bayar    : ${order.paymentBank || order.paymentMethod}\n`;
    text += `Status Bayar    : ${order.paymentStatus === 'PAID' ? 'LUNAS / TERVERIFIKASI' : order.paymentStatus}\n`;
    text += `Status Pesanan  : ${order.orderStatus}\n`;

    if (order.paymentMethod === 'CASH' && order.cashPaid) {
      text += `Uang Diterima   : ${formatRupiah(order.cashPaid)}\n`;
      text += `Kembalian       : ${formatRupiah(order.cashChange || 0)}\n`;
    }

    text += divider;
    text += '   Terima kasih atas kunjungan Anda!    \n';
    text += 'Semoga hasil panen berlimpah dan berkah \n';
    text += 'Simpan struk ini sebagai bukti transaksi\n';
    text += '========================================\n';

    return text;
  };

  // Printing implementation via isolated iframe for thermal output
  const handlePrint = () => {
    const printArea = document.getElementById('thermal-receipt-content');
    if (!printArea) {
      window.print();
      return;
    }

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        window.print();
        return;
      }

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Struk_${order.orderNumber}</title>
            <style>
              @page {
                size: 78mm auto;
                margin: 4mm;
              }
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                line-height: 1.35;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 4px;
                width: 72mm;
                max-width: 100%;
              }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .dashed { border-top: 1px dashed #000; margin: 6px 0; }
              .double { border-top: 2px dashed #000; margin: 8px 0; }
              .flex { display: flex; justify-content: space-between; }
              .item-title { font-weight: bold; word-break: break-word; }
              .small { font-size: 9.5px; }
            </style>
          </head>
          <body>
            ${printArea.innerHTML}
          </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 800);
      }, 300);

      showToast('Perintah cetak struk berhasil dikirim', 'info');
    } catch (e) {
      console.warn('Fallback to window.print', e);
      window.print();
    }
  };

  // Download Receipt as high-resolution PNG image
  const handleDownloadPng = async () => {
    const printArea = document.getElementById('thermal-receipt-content');
    if (!printArea) {
      showToast('Elemen struk tidak ditemukan', 'error');
      return;
    }

    try {
      setIsGeneratingPng(true);
      const canvas = await html2canvas(printArea, {
        scale: 3, // High DPI for crystal crisp text
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `struk-${order.orderNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Gambar struk PNG berhasil diunduh!', 'success');
    } catch (err) {
      console.error('Failed to generate PNG receipt:', err);
      showToast('Gagal membuat gambar PNG struk', 'error');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // Download Receipt as PDF document
  const handleDownloadPdf = async () => {
    const printArea = document.getElementById('thermal-receipt-content');
    if (!printArea) {
      showToast('Elemen struk tidak ditemukan', 'error');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const canvas = await html2canvas(printArea, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const mmWidth = 80; // Standard thermal paper width 80mm
      const mmHeight = (canvas.height * mmWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [mmWidth, mmHeight + 10],
      });

      pdf.addImage(imgData, 'PNG', 0, 5, mmWidth, mmHeight);
      pdf.save(`struk-${order.orderNumber}.pdf`);

      showToast('Dokumen struk PDF berhasil diunduh!', 'success');
    } catch (err) {
      console.error('Failed to generate PDF receipt:', err);
      showToast('Gagal membuat file PDF struk', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Copy to clipboard
  const handleCopyText = () => {
    const text = generateReceiptText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Teks struk berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Download .txt receipt file
  const handleDownloadTxt = () => {
    const text = generateReceiptText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `struk-${order.orderNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('File struk (.txt) berhasil diunduh', 'success');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Struk Bukti Pembayaran Digital" maxWidth="md">
      <div className="space-y-4">
        {/* Quick Format Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-stone-500">
          <span>Pilih format unduhan bukti pembayaran:</span>
          <div className="flex items-center gap-1.5 font-semibold text-[11px]">
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
              PDF
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              PNG
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Thermal
            </span>
          </div>
        </div>

        {/* Thermal Receipt Visual Preview Container */}
        <div className="bg-stone-100 p-3 sm:p-4 rounded-2xl border border-stone-200 max-h-[58vh] overflow-y-auto">
          <div
            id="thermal-receipt-content"
            className="bg-white p-5 rounded-xl shadow-xs border border-stone-200 font-mono text-stone-900 text-xs leading-relaxed max-w-sm mx-auto"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-stone-300">
              <div className="font-extrabold text-sm tracking-wider uppercase text-stone-900">
                KIOS TANI MAKMUR
              </div>
              <div className="text-[10px] text-stone-600 mt-0.5">
                Kios Sarana Obat & Bibit Pertanian
              </div>
              <div className="text-[10px] text-stone-500">
                Pasar Agrobisnis No. 12, Karawang, Jabar
              </div>
              <div className="text-[10px] text-stone-500">WA/Telp: 0812-3456-7890</div>
            </div>

            {/* Transaction Metadata */}
            <div className="py-2.5 border-b border-dashed border-stone-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">No. Transaksi:</span>
                <span className="font-bold select-all">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Tanggal:</span>
                <span>{formatDateIndo(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Pelanggan:</span>
                <span className="font-semibold">{order.customerName}</span>
              </div>
              {order.customerPhone && order.customerPhone !== '-' && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Kontak:</span>
                  <span>{order.customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-500">Kasir / Admin:</span>
                <span>{currentUser?.name || 'Kasir Toko'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Jenis Layanan:</span>
                <span className="font-medium">
                  {order.type === 'POS' ? 'Kasir Toko (Counter)' : 'Marketplace Online'}
                </span>
              </div>

              {/* Shipping info if available */}
              {order.courierName && (
                <div className="flex justify-between text-blue-800">
                  <span className="text-stone-500">Kurir Pengiriman:</span>
                  <span className="font-semibold">{order.courierName}</span>
                </div>
              )}
              {order.trackingNumber && (
                <div className="flex justify-between text-blue-800">
                  <span className="text-stone-500">No. Resi Pengiriman:</span>
                  <span className="font-bold font-mono">{order.trackingNumber}</span>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex justify-between text-emerald-700">
                  <span className="text-stone-500">Waktu Diterima:</span>
                  <span className="font-semibold">{formatDateIndo(order.deliveredAt)}</span>
                </div>
              )}
              {order.voucherCode && (
                <div className="flex justify-between text-emerald-800">
                  <span className="text-stone-500">Kupon Voucher:</span>
                  <span className="font-bold font-mono">{order.voucherCode}</span>
                </div>
              )}
            </div>

            {/* Itemized List */}
            <div className="py-2.5 border-b border-dashed border-stone-300 space-y-2">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pb-1">
                Rincian Barang
              </div>
              {order.items.map((it, idx) => (
                <div key={idx} className="text-[11px]">
                  <div className="font-bold text-stone-900 leading-snug">{it.productName}</div>
                  <div className="flex justify-between text-stone-600 text-[10px] mt-0.5">
                    <span>
                      {it.quantity} {it.unit} x {formatRupiah(it.price)}
                    </span>
                    <span className="font-semibold text-stone-900">
                      {formatRupiah(it.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations & Totals */}
            <div className="py-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600 text-[11px]">
                <span>Subtotal ({totalItemsCount} item):</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>

              {order.voucherBreakdown && order.voucherBreakdown.length > 0 ? (
                order.voucherBreakdown.map((vb, i) => (
                  <div key={i} className="flex justify-between text-emerald-700 text-[11px]">
                    <span className="truncate pr-1">• {vb.label}:</span>
                    <span className="shrink-0 font-bold">-{formatRupiah(vb.amount)}</span>
                  </div>
                ))
              ) : order.discount > 0 ? (
                <div className="flex justify-between text-emerald-700 text-[11px]">
                  <span>Potongan Diskon:</span>
                  <span className="font-bold">-{formatRupiah(order.discount)}</span>
                </div>
              ) : null}

              {order.shippingCost > 0 && (
                <div className="flex justify-between text-stone-600 text-[11px]">
                  <span>Biaya Ongkos Kirim:</span>
                  <span>{formatRupiah(order.shippingCost)}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-sm text-stone-900 pt-1.5 border-t border-dashed border-stone-300">
                <span>TOTAL AKHIR:</span>
                <span className="text-emerald-900">{formatRupiah(order.total)}</span>
              </div>

              {/* Payment Details */}
              <div className="pt-2 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Metode Bayar:</span>
                  <span className="font-bold text-stone-800">
                    {order.paymentBank || order.paymentMethod}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-stone-500">Status Pembayaran:</span>
                  <span className="font-bold text-emerald-700">
                    {order.paymentStatus === 'PAID' ? 'LUNAS / TERVERIFIKASI' : order.paymentStatus}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-stone-500">Status Pesanan:</span>
                  <span className="font-semibold text-stone-800">
                    {order.orderStatus === 'COMPLETED'
                      ? 'SELESAI'
                      : order.orderStatus === 'DELIVERED'
                      ? 'DITERIMA PELANGGAN'
                      : order.orderStatus === 'SHIPPED'
                      ? 'SEDANG DIKIRIM'
                      : order.orderStatus === 'PROCESSING'
                      ? 'SEDANG DIPROSES'
                      : order.orderStatus}
                  </span>
                </div>

                {order.paymentMethod === 'CASH' && order.cashPaid && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Uang Diterima:</span>
                      <span>{formatRupiah(order.cashPaid)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-stone-600">Uang Kembalian:</span>
                      <span className="text-emerald-800">{formatRupiah(order.cashChange || 0)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 border-t border-dashed border-stone-300 text-[10px] text-stone-500 space-y-1">
              <p>Terima kasih atas kunjungan Anda!</p>
              <p>Semoga hasil panen Anda melimpah dan berkah.</p>
              <p className="text-[9px] text-stone-400">
                Struk ini merupakan bukti transaksi resmi UD Tani Makmur.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons for Download PDF, PNG, Print & Copy */}
        <div className="space-y-2 font-sans">
          {/* Primary Download Buttons (PDF & PNG) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="py-2.5 px-3 rounded-xl bg-rose-700 hover:bg-rose-800 active:scale-98 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Unduh Struk PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isGeneratingPng}
              onClick={handleDownloadPng}
              className="py-2.5 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-98 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isGeneratingPng ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat PNG...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  <span>Unduh Struk PNG (Gambar)</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Action Buttons (Print Thermal, Copy WA, Download TXT) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Thermal</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-300" />
                  <span>Salin Teks WA</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="py-2.5 px-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-stone-500" />
              <span>Unduh .txt</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
