import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp, formatRupiah } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { orderRepo, productRepo } from '../../services/db';
import { Order, OrderItem, PaymentMethod } from '../../types';
import {
  CreditCard,
  QrCode,
  Building2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowLeft,
  ShieldCheck,
  FileText,
  Tag,
  Sparkles,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { cart, cartTotal, clearCart, showToast, refreshData, customers } = useApp();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(currentUser?.address || '');
  const [farmerGroup, setFarmerGroup] = useState(currentUser?.farmerGroup || '');
  const [shippingType, setShippingType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [selectedBank, setSelectedBank] = useState<'BRI' | 'BCA' | 'QRIS'>('BRI');
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Sync with current user profile
  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name || '');
      setCustomerPhone(currentUser.phone || '');
      setCustomerAddress(currentUser.address || '');
      setFarmerGroup(currentUser.farmerGroup || '');
    }
  }, [currentUser]);

  // Match customer in database to check Admin membership & voucher authorization
  const activeCustomer = useMemo(() => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const userPhone = (currentUser?.phone || '').replace(/\D/g, '');
    return (
      customers.find(
        (c) =>
          (currentUser?.id && c.id === currentUser.id) ||
          (cleanPhone && c.phone && c.phone.replace(/\D/g, '') === cleanPhone) ||
          (userPhone && c.phone && c.phone.replace(/\D/g, '') === userPhone) ||
          (customerName && c.name.toLowerCase() === customerName.trim().toLowerCase())
      ) || null
    );
  }, [customers, currentUser, customerPhone, customerName]);

  // Only show & allow voucher IF customer is registered as member AND admin has granted voucher (hasMemberVoucher: true)
  const isCustomerMemberWithVoucher = Boolean(
    activeCustomer && activeCustomer.isMember && activeCustomer.hasMemberVoucher
  );

  // Vouchers state - Member 15% discount
  const [applyMemberDiscount, setApplyMemberDiscount] = useState<boolean>(true);

  const shippingCost = shippingType === 'DELIVERY' ? 15000 : 0;
  const memberDiscount = isCustomerMemberWithVoucher && applyMemberDiscount ? Math.round(cartTotal * 0.15) : 0;
  const totalDiscount = memberDiscount;
  const grandTotal = Math.max(0, cartTotal - totalDiscount + shippingCost);

  // Handle local image upload to data URL
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran file maksimal 5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofUrl(reader.result as string);
        showToast('Bukti transfer berhasil dipilih', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  // Sample receipt generator for quick test
  const handleUseSampleProof = () => {
    const sampleProof =
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80';
    setPaymentProofUrl(sampleProof);
    showToast('Contoh bukti transfer berhasil dimuat', 'info');
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      showToast('Keranjang belanja kosong', 'error');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Mohon lengkapi nama dan nomor telepon penerima', 'error');
      return;
    }

    if (shippingType === 'DELIVERY' && !customerAddress.trim()) {
      showToast('Mohon lengkapi alamat pengiriman', 'error');
      return;
    }

    if (!paymentProofUrl) {
      showToast('Mohon lampirkan bukti pembayaran/transfer terlebih dahulu', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate stock availability
      for (const item of cart) {
        if (item.quantity > item.product.stock) {
          showToast(
            `Stok ${item.product.name} tidak mencukupi (Tersedia: ${item.product.stock})`,
            'error'
          );
          setIsSubmitting(false);
          return;
        }
      }

      const orderItems: OrderItem[] = cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        productCode: item.product.code,
        category: item.product.category,
        price: item.product.price,
        costPrice: item.product.costPrice,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity,
        unit: item.product.unit,
        imageUrl: item.product.imageUrl,
      }));

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

      const voucherBreakdown: { label: string; amount: number; percent?: number }[] = [];
      const voucherCodes: string[] = [];
      if (memberDiscount > 0 && isCustomerMemberWithVoucher) {
        const code = activeCustomer?.memberVoucherCode || 'MEMBER15';
        voucherBreakdown.push({
          label: `Voucher Khusus Member (15%) - ${code}`,
          amount: memberDiscount,
          percent: 15,
        });
        voucherCodes.push(code);
      }

      const assignedCustomerId =
        (currentUser?.role === 'customer' && currentUser?.id) ||
        activeCustomer?.id ||
        currentUser?.id ||
        'cust-' + Date.now();

      const newOrder: Order = {
        id: 'ord-' + Date.now(),
        orderNumber,
        type: 'MARKETPLACE',
        customerId: assignedCustomerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: shippingType === 'DELIVERY' ? customerAddress.trim() : 'Ambil Langsung di Kios TaniMakmur',
        items: orderItems,
        subtotal: cartTotal,
        discount: totalDiscount,
        voucherCode: voucherCodes.join(', ') || undefined,
        voucherName: voucherBreakdown.map((v) => v.label).join(', ') || undefined,
        voucherBreakdown: voucherBreakdown.length > 0 ? voucherBreakdown : undefined,
        shippingCost,
        total: grandTotal,
        paymentMethod,
        paymentStatus: 'WAITING_APPROVAL',
        paymentBank:
          selectedBank === 'BRI'
            ? 'Bank BRI (0123-01-002345-50)'
            : selectedBank === 'BCA'
            ? 'Bank BCA (123-456-7890)'
            : 'QRIS Tani Makmur',
        paymentProofUrl,
        orderStatus: 'PENDING_APPROVAL',
        notes: farmerGroup ? `Kelompok Tani: ${farmerGroup}` : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Deduct stock in IndexedDB
      await productRepo.deductStock(
        cart.map((c) => ({ productId: c.product.id, quantity: c.quantity }))
      );

      // 2. Save order to IndexedDB
      const saved = await orderRepo.save(newOrder);

      // Track this order specifically for this customer account
      try {
        if (assignedCustomerId) {
          const customerOrderKey = `tanimakmur_customer_orders_${assignedCustomerId}`;
          const stored = JSON.parse(localStorage.getItem(customerOrderKey) || '[]');
          if (!stored.includes(saved.id)) {
            stored.unshift(saved.id);
            localStorage.setItem(customerOrderKey, JSON.stringify(stored));
          }
        }

        if (currentUser?.id && currentUser.id !== assignedCustomerId) {
          const userOrderKey = `tanimakmur_customer_orders_${currentUser.id}`;
          const storedUser = JSON.parse(localStorage.getItem(userOrderKey) || '[]');
          if (!storedUser.includes(saved.id)) {
            storedUser.unshift(saved.id);
            localStorage.setItem(userOrderKey, JSON.stringify(storedUser));
          }
        }

        // Only save to generic device backup IF guest (not logged into an account)
        if (!currentUser) {
          const deviceOrders = JSON.parse(localStorage.getItem('tanimakmur_customer_orders') || '[]');
          if (!deviceOrders.includes(saved.id)) {
            deviceOrders.unshift(saved.id);
            localStorage.setItem('tanimakmur_customer_orders', JSON.stringify(deviceOrders));
          }
          localStorage.setItem('tanimakmur_customer_last_phone', customerPhone.trim());
          localStorage.setItem('tanimakmur_customer_last_name', customerName.trim());
        }
      } catch (e) {
        console.warn('Failed to save to local customer order tracking', e);
      }

      // 3. Clear cart & update state
      clearCart();
      await refreshData();
      setCreatedOrder(saved);
      showToast('Pesanan berhasil dibuat! Menunggu verifikasi admin.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses pesanan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-stone-900 tracking-tight">
          Pesanan Berhasil Dikirim!
        </h2>
        <p className="text-stone-600 text-sm mt-2 max-w-md mx-auto">
          Terima kasih, Bapak/Ibu <strong className="text-stone-900">{createdOrder.customerName}</strong>. Bukti pembayaran Anda telah kami terima dan masuk ke antrean verifikasi Admin Toko.
        </p>

        <div className="mt-8 p-6 bg-white rounded-2xl border border-stone-200 shadow-xs text-left">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div>
              <span className="text-xs text-stone-400">Nomor Pesanan:</span>
              <p className="font-mono font-bold text-sm text-stone-900">{createdOrder.orderNumber}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-400">Total Pembayaran:</span>
              <p className="font-bold text-emerald-800 text-base">{formatRupiah(createdOrder.total)}</p>
            </div>
          </div>

          <div className="py-4 text-xs space-y-2 text-stone-600">
            <div className="flex justify-between">
              <span>Metode Pembayaran:</span>
              <span className="font-semibold text-stone-800">{createdOrder.paymentBank}</span>
            </div>
            <div className="flex justify-between">
              <span>Status Pembayaran:</span>
              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Menunggu Persetujuan Admin
              </span>
            </div>
            <div className="flex justify-between">
              <span>Pengiriman:</span>
              <span className="font-semibold text-stone-800">{createdOrder.customerAddress}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row gap-3">
            <Link
              to="/orders"
              className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs text-center transition shadow-xs"
            >
              Cek Status Pesanan Saya
            </Link>
            <Link
              to="/"
              className="py-2.5 px-4 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs text-center transition"
            >
              Kembali ke Katalog Produk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-stone-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-stone-900">Keranjang Belanja Kosong</h2>
        <p className="text-xs text-stone-500 mt-1 mb-6">
          Silakan tambahkan produk bibit atau obat pertanian terlebih dahulu sebelum checkout.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Produk</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link
          to="/"
          className="text-xs font-medium text-stone-500 hover:text-stone-900 flex items-center gap-1 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Katalog Produk</span>
        </Link>
        <span className="text-stone-300">/</span>
        <span className="text-xs font-semibold text-stone-900">Checkout & Pembayaran</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Form Info Penerima & Pembayaran */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmitOrder} className="space-y-6">
            {/* 1. Data Penerima */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-700" />
                <span>1. Data Penerima & Pengiriman</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nama Lengkap Petani / Pembeli *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Budi Hermawan"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nomor WhatsApp / Telepon *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Metode Pengiriman
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShippingType('DELIVERY')}
                    className={`p-3 rounded-xl border text-left transition ${
                      shippingType === 'DELIVERY'
                        ? 'border-emerald-700 bg-emerald-50/50 text-emerald-900'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="font-semibold text-xs">Kirim ke Alamat Petani</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">Ongkir Flat: Rp 15.000</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShippingType('PICKUP')}
                    className={`p-3 rounded-xl border text-left transition ${
                      shippingType === 'PICKUP'
                        ? 'border-emerald-700 bg-emerald-50/50 text-emerald-900'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="font-semibold text-xs">Ambil di Kios TaniMakmur</div>
                    <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Gratis (Rp 0)</div>
                  </button>
                </div>
              </div>

              {shippingType === 'DELIVERY' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Alamat Lengkap Pengiriman *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Dusun / Desa, RT/RW, Patokan dekat pos kamling atau sawah"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Kelompok Tani / Gapoktan (Opsional)
                </label>
                <input
                  type="text"
                  value={farmerGroup}
                  onChange={(e) => setFarmerGroup(e.target.value)}
                  placeholder="Contoh: Kelompok Tani Subur Makmur Karawang"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-600"
                />
              </div>
            </div>

            {/* 2. Metode Pembayaran & Bukti Bayar */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-5">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>2. Pembayaran & Upload Bukti Transfer</span>
              </h3>

              {/* Bank / QRIS Selection */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBank('BRI');
                    setPaymentMethod('BANK_TRANSFER');
                  }}
                  className={`p-3 rounded-xl border text-center transition ${
                    selectedBank === 'BRI'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                      : 'border-stone-200 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <div className="text-xs font-bold">Bank BRI</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Rekening Resmi</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBank('BCA');
                    setPaymentMethod('BANK_TRANSFER');
                  }}
                  className={`p-3 rounded-xl border text-center transition ${
                    selectedBank === 'BCA'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                      : 'border-stone-200 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <div className="text-xs font-bold">Bank BCA</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Rekening Resmi</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBank('QRIS');
                    setPaymentMethod('QRIS');
                  }}
                  className={`p-3 rounded-xl border text-center transition ${
                    selectedBank === 'QRIS'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                      : 'border-stone-200 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-center gap-1">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QRIS</span>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Semua E-Wallet</div>
                </button>
              </div>

              {/* Payment Details Box */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-2">
                {selectedBank === 'BRI' && (
                  <div>
                    <div className="font-semibold text-stone-800">Transfer ke Rekening Bank BRI:</div>
                    <div className="font-mono text-sm font-black text-stone-900 mt-1 select-all">
                      0123-01-002345-50
                    </div>
                    <div className="text-stone-500 mt-0.5">a/n UD TANI MAKMUR SEJAHTERA</div>
                  </div>
                )}

                {selectedBank === 'BCA' && (
                  <div>
                    <div className="font-semibold text-stone-800">Transfer ke Rekening Bank BCA:</div>
                    <div className="font-mono text-sm font-black text-stone-900 mt-1 select-all">
                      123-456-7890
                    </div>
                    <div className="text-stone-500 mt-0.5">a/n JOKO SANTOSO (KASIR TANI MAKMUR)</div>
                  </div>
                )}

                {selectedBank === 'QRIS' && (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-28 h-28 bg-white p-2 rounded-lg border border-stone-300 flex items-center justify-center shrink-0">
                      <QrCode className="w-24 h-24 text-stone-900" />
                    </div>
                    <div>
                      <div className="font-bold text-stone-900">QRIS Standar Nasional</div>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        Scan menggunakan aplikasi GoPay, OVO, Dana, ShopeePay, BCA Mobile, Livin Mandiri, atau BRImo.
                      </p>
                      <div className="text-[11px] font-bold text-emerald-800 mt-2">
                        Nominal Transfer: {formatRupiah(grandTotal)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Proof of Payment Upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-800">
                    Unggah Bukti Struk / Screenshot Transfer *
                  </label>
                  <button
                    type="button"
                    onClick={handleUseSampleProof}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline"
                  >
                    Gunakan Contoh Bukti Slip
                  </button>
                </div>

                <div className="border-2 border-dashed border-stone-300 rounded-xl p-4 text-center hover:border-emerald-600 transition bg-stone-50/50">
                  {paymentProofUrl ? (
                    <div className="space-y-2">
                      <img
                        src={paymentProofUrl}
                        alt="Bukti Transfer"
                        className="max-h-48 mx-auto rounded-lg border border-stone-200 object-contain shadow-xs"
                      />
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Bukti siap diverifikasi
                        </span>
                        <button
                          type="button"
                          onClick={() => setPaymentProofUrl('')}
                          className="text-xs text-rose-600 underline font-medium ml-2"
                        >
                          Hapus / Ganti
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-2xs">
                        <span>Pilih Gambar dari Perangkat</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-stone-400 mt-1">Format JPG, PNG, atau WebP (Maks 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Menyimpan Pesanan...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Konfirmasi & Buat Pesanan ({formatRupiah(grandTotal)})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-5 sticky top-24">
          <h3 className="text-base font-bold text-stone-900 pb-3 border-b border-stone-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>Ringkasan Pesanan ({cart.length} Jenis Produk)</span>
          </h3>

          <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.product.id} className="py-2.5 flex items-center gap-3">
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  className="w-12 h-12 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-stone-900 truncate">{item.product.name}</h4>
                  <div className="text-[11px] text-stone-500">
                    {item.quantity} x {formatRupiah(item.product.price)}
                  </div>
                </div>
                <div className="text-xs font-bold text-stone-900">
                  {formatRupiah(item.product.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          {/* Voucher Promo Selection for Customer: Exclusively Member 15% when approved by admin */}
          {isCustomerMemberWithVoucher && (
            <div className="p-3.5 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 rounded-2xl border border-emerald-300 space-y-2.5 text-xs shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    15%
                  </div>
                  <div>
                    <div className="font-extrabold text-stone-900 flex items-center gap-1.5">
                      <span>Voucher Khusus Member</span>
                      <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">
                        Diskon 15%
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Terdaftar oleh Admin untuk {activeCustomer?.name}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[11px] font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-200">
                  {activeCustomer?.memberVoucherCode || 'MEMBER15'}
                </span>
              </div>

              {/* Claim Member Voucher 15% */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-200 cursor-pointer hover:border-emerald-500 hover:shadow-xs transition">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={applyMemberDiscount}
                    onChange={(e) => setApplyMemberDiscount(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 border-stone-300"
                  />
                  <div>
                    <div className="font-bold text-xs text-stone-900">
                      Klaim Voucher Diskon 15%
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Potongan 15% dari total belanja
                    </div>
                  </div>
                </div>
                {applyMemberDiscount && (
                  <span className="font-bold text-emerald-700 text-xs shrink-0">
                    -{formatRupiah(memberDiscount)}
                  </span>
                )}
              </label>
            </div>
          )}

          <div className="pt-3 border-t border-stone-100 space-y-2 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal Produk</span>
              <span className="font-semibold text-stone-900">{formatRupiah(cartTotal)}</span>
            </div>

            {memberDiscount > 0 && isCustomerMemberWithVoucher && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Diskon Member (15%)</span>
                <span className="font-bold">-{formatRupiah(memberDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Biaya Pengiriman</span>
              <span className="font-semibold text-stone-900">
                {shippingCost === 0 ? 'Gratis (Ambil Sendiri)' : formatRupiah(shippingCost)}
              </span>
            </div>
            <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline text-sm">
              <span className="font-bold text-stone-900">Total Pembayaran</span>
              <span className="font-black text-emerald-800 text-lg font-mono">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              Stok produk akan langsung terpotong secara otomatis di IndexedDB saat pesanan dibuat, menjaga ketersediaan barang untuk petani lain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
