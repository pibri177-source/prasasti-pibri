import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, formatRupiah, formatDateIndo } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Product, Order, OrderItem, PaymentMethod, Customer, PromoSettings } from '../../types';
import { handleProductImageError } from '../../utils/productImages';
import {
  orderRepo,
  productRepo,
  getPromoSettings,
  savePromoSettings,
  DEFAULT_PROMO_SETTINGS,
  generateMemberVoucherCode,
} from '../../services/db';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Modal } from '../../components/common/Modal';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  CheckCircle,
  AlertCircle,
  UserPlus,
  RotateCcw,
  Receipt,
  Sprout,
  ShieldAlert,
  Sparkles,
  Tag,
  Gift,
  Calendar,
  Check,
  Zap,
  Info,
  Settings,
  Lock,
  Copy,
} from 'lucide-react';

export const POSView: React.FC = () => {
  const { products, categories, customers, refreshData, showToast } = useApp();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // POS Cart State
  const [posItems, setPosItems] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('guest');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');

  // Promo Settings (Controlled exclusively by Admin)
  const [promoSettings, setPromoSettings] = useState<PromoSettings>(() => getPromoSettings());
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [tempTwinDateEnabled, setTempTwinDateEnabled] = useState(promoSettings.twinDatePromoEnabled);
  const [tempTwinDateOverride, setTempTwinDateOverride] = useState(promoSettings.twinDateOverrideActive);
  const [tempMinSpend, setTempMinSpend] = useState(promoSettings.twinDateMinSpend);

  // Sync settings when changed externally
  useEffect(() => {
    const handleSettingsChange = (e: any) => {
      if (e.detail) {
        setPromoSettings(e.detail);
      }
    };
    window.addEventListener('tanimakmur_promo_settings_change', handleSettingsChange);
    return () => window.removeEventListener('tanimakmur_promo_settings_change', handleSettingsChange);
  }, []);

  // Voucher / Promotion States
  const [applyMemberDiscount, setApplyMemberDiscount] = useState<boolean>(false);
  const [applyTwinDateDiscount, setApplyTwinDateDiscount] = useState<boolean>(false);
  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [manualDiscount, setManualDiscount] = useState<number>(0);

  // Twin Date Date Calculation (1.1, 2.2, 3.3, 4.4, ..., 12.12)
  const today = useMemo(() => new Date(), []);
  const todayDay = today.getDate();
  const todayMonth = today.getMonth() + 1;
  const isRealTwinDate = todayDay === todayMonth;

  // Tanggal kembar is active ONLY IF enabled by admin AND (real twin date OR admin override is turned ON)
  const isTwinDateActiveNow =
    promoSettings.twinDatePromoEnabled && (isRealTwinDate || promoSettings.twinDateOverrideActive);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Success Receipt Modal
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Check if selected customer is granted member voucher rights by Admin
  const customerHasMemberVoucher = useMemo(() => {
    if (!selectedCustomer) return false;
    return selectedCustomer.hasMemberVoucher !== false && !!(selectedCustomer.memberVoucherCode || selectedCustomer.memberCode);
  }, [selectedCustomer]);

  const customerPersonalVoucherCode = useMemo(() => {
    if (!selectedCustomer) return '';
    return selectedCustomer.memberVoucherCode || generateMemberVoucherCode(selectedCustomer.name);
  }, [selectedCustomer]);

  // When customer changes, automatically enable member voucher IF they have rights, otherwise turn it off
  useEffect(() => {
    if (customerHasMemberVoucher) {
      setApplyMemberDiscount(true);
    } else {
      setApplyMemberDiscount(false);
    }
  }, [selectedCustomerId, customerHasMemberVoucher]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return posItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [posItems]);

  // AUTOMATIC CLAIM RULE: Tanggal Kembar voucher automatically claims when conditions are met
  const isTwinDateSpendEligible = subtotal > promoSettings.twinDateMinSpend;

  useEffect(() => {
    if (isTwinDateActiveNow && isTwinDateSpendEligible) {
      // Auto-claim when conditions are met on twin date
      setApplyTwinDateDiscount(true);
    } else if (!isTwinDateActiveNow) {
      setApplyTwinDateDiscount(false);
    }
  }, [isTwinDateActiveNow, isTwinDateSpendEligible]);

  // 1. Voucher Member: 15% dari total belanja (hanya jika diberi hak oleh admin)
  const memberDiscountAmount = useMemo(() => {
    if (!applyMemberDiscount || !customerHasMemberVoucher) return 0;
    return Math.round(subtotal * (promoSettings.memberDiscountPercent / 100));
  }, [applyMemberDiscount, customerHasMemberVoucher, subtotal, promoSettings.memberDiscountPercent]);

  // 2. Voucher Tanggal Kembar: 5% dari total belanja yang lebih dari 150.000 (otomatis hanya saat tanggal kembar aktif)
  const twinDateDiscountAmount = useMemo(() => {
    if (!applyTwinDateDiscount || !isTwinDateActiveNow || !isTwinDateSpendEligible) return 0;
    return Math.round(subtotal * (promoSettings.twinDateDiscountPercent / 100));
  }, [applyTwinDateDiscount, isTwinDateActiveNow, isTwinDateSpendEligible, subtotal, promoSettings.twinDateDiscountPercent]);

  // Total discounts
  const totalDiscount = memberDiscountAmount + twinDateDiscountAmount + manualDiscount;
  const total = Math.max(0, subtotal - totalDiscount);
  const changeAmount = paymentMethod === 'CASH' ? Math.max(0, cashGiven - total) : 0;

  // Filtered products for POS grid
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Add product to POS cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast(`Stok ${product.name} telah habis!`, 'error');
      return;
    }

    const existing = posItems.find((item) => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + 1 > product.stock) {
      showToast(`Maksimal stok tercapai: ${product.stock} ${product.unit}`, 'error');
      return;
    }

    if (existing) {
      setPosItems((prev) =>
        prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setPosItems((prev) => [...prev, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setPosItems((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }

    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    if (qty > targetProduct.stock) {
      showToast(`Stok hanya tersisa ${targetProduct.stock} ${targetProduct.unit}`, 'error');
      return;
    }

    setPosItems((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: qty } : item))
    );
  };

  const clearPosCart = () => {
    setPosItems([]);
    setManualDiscount(0);
    setCashGiven(0);
    setCustomCustomerName('');
    setSelectedCustomerId('guest');
    setApplyMemberDiscount(false);
    setApplyTwinDateDiscount(false);
    setCouponCodeInput('');
  };

  // Open Promo Config Modal
  const openPromoConfigModal = () => {
    setTempTwinDateEnabled(promoSettings.twinDatePromoEnabled);
    setTempTwinDateOverride(promoSettings.twinDateOverrideActive);
    setTempMinSpend(promoSettings.twinDateMinSpend);
    setIsPromoModalOpen(true);
  };

  const handleSavePromoSettings = () => {
    const updated: PromoSettings = {
      ...promoSettings,
      twinDatePromoEnabled: tempTwinDateEnabled,
      twinDateOverrideActive: tempTwinDateOverride,
      twinDateMinSpend: Math.max(10000, tempMinSpend),
    };
    savePromoSettings(updated);
    setPromoSettings(updated);
    setIsPromoModalOpen(false);
    showToast('Pengaturan promo tanggal kembar berhasil disimpan oleh Admin', 'success');
  };

  // Handle Coupon Code Submission
  const handleApplyCouponCode = () => {
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;

    // Check if code matches selected customer's personal code
    if (customerPersonalVoucherCode && code === customerPersonalVoucherCode.toUpperCase()) {
      if (!customerHasMemberVoucher) {
        showToast('Voucher untuk pelanggan ini sedang dinonaktifkan oleh Admin', 'error');
        return;
      }
      setApplyMemberDiscount(true);
      showToast(`Voucher personal ${code} berhasil diaktifkan (-15%)!`, 'success');
      setCouponCodeInput('');
      return;
    }

    // Check if it matches any other customer's personal voucher code
    const matchedCustomer = customers.find(
      (c) => c.memberVoucherCode?.toUpperCase() === code
    );
    if (matchedCustomer) {
      if (selectedCustomerId !== matchedCustomer.id) {
        showToast(
          `Kode ${code} adalah voucher personal milik ${matchedCustomer.name}. Pilih pelanggan tersebut untuk menggunakannya.`,
          'info'
        );
        setSelectedCustomerId(matchedCustomer.id);
        setApplyMemberDiscount(true);
        setCouponCodeInput('');
        return;
      }
    }

    // Check twin date code
    if (code === 'KEMBAR5' || code === 'TANGGALKEMBAR' || code === 'KEMBAR') {
      if (!isTwinDateActiveNow) {
        showToast(
          'Promo Tanggal Kembar hanya aktif pada tanggal kembar (atau saat diaktifkan oleh admin)',
          'error'
        );
      } else if (!isTwinDateSpendEligible) {
        showToast(
          `Syarat belanja belum terpenuhi. Belanja minimal di atas ${formatRupiah(promoSettings.twinDateMinSpend)}`,
          'error'
        );
      } else {
        setApplyTwinDateDiscount(true);
        showToast('Promo Tanggal Kembar 5% berhasil diaktifkan!', 'success');
        setCouponCodeInput('');
      }
      return;
    }

    showToast('Kode voucher tidak valid atau tidak cocok dengan pelanggan ini', 'error');
  };

  // Process POS Checkout
  const handleProcessTransaction = async () => {
    if (posItems.length === 0) {
      showToast('Keranjang kasir masih kosong', 'error');
      return;
    }

    if (paymentMethod === 'CASH' && cashGiven < total) {
      showToast('Nominal uang tunai kurang dari total belanja', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      // Validate inventory
      for (const item of posItems) {
        const prod = products.find((p) => p.id === item.product.id);
        if (!prod || item.quantity > prod.stock) {
          showToast(`Stok produk ${item.product.name} tidak mencukupi`, 'error');
          setIsProcessing(false);
          return;
        }
      }

      // Customer name resolution
      let finalCustomerName = 'Pelanggan Umum (Walk-in)';
      let customerPhone = '-';
      if (selectedCustomerId !== 'guest' && selectedCustomer) {
        finalCustomerName = selectedCustomer.name;
        customerPhone = selectedCustomer.phone;
      } else if (customCustomerName.trim()) {
        finalCustomerName = customCustomerName.trim();
      }

      const orderItems: OrderItem[] = posItems.map((item) => ({
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
      const orderNumber = `POS-${dateStr}-${randomSuffix}`;

      // Voucher Breakdown records with specific personal voucher code
      const voucherBreakdown: { label: string; amount: number; percent?: number }[] = [];
      const voucherCodes: string[] = [];

      if (memberDiscountAmount > 0 && selectedCustomer) {
        const codeUsed = customerPersonalVoucherCode || `MBR-${selectedCustomer.name.slice(0, 4).toUpperCase()}`;
        voucherBreakdown.push({
          label: `Voucher Member 15% (${codeUsed})`,
          amount: memberDiscountAmount,
          percent: 15,
        });
        voucherCodes.push(codeUsed);
      }

      if (twinDateDiscountAmount > 0) {
        voucherBreakdown.push({
          label: 'Promo Tanggal Kembar 5% (> Rp 150.000)',
          amount: twinDateDiscountAmount,
          percent: 5,
        });
        voucherCodes.push('KEMBAR5');
      }

      if (manualDiscount > 0) {
        voucherBreakdown.push({
          label: 'Potongan Khusus Kasir',
          amount: manualDiscount,
        });
      }

      const newOrder: Order = {
        id: 'pos-' + Date.now(),
        orderNumber,
        type: 'POS',
        customerId: selectedCustomerId,
        customerName: finalCustomerName,
        customerPhone,
        customerAddress: 'Transaksi Counter Kasir Toko',
        items: orderItems,
        subtotal,
        discount: totalDiscount,
        voucherCode: voucherCodes.join(', ') || undefined,
        voucherName: voucherBreakdown.map((b) => b.label).join(', ') || undefined,
        voucherBreakdown: voucherBreakdown.length > 0 ? voucherBreakdown : undefined,
        shippingCost: 0,
        total,
        paymentMethod,
        paymentStatus: 'PAID',
        paymentBank: paymentMethod === 'CASH' ? 'Tunai di Kasir' : paymentMethod,
        orderStatus: 'COMPLETED',
        cashPaid: paymentMethod === 'CASH' ? cashGiven : total,
        cashChange: paymentMethod === 'CASH' ? changeAmount : 0,
        notes: `Dilayani oleh: ${currentUser?.name || 'Kasir Toko'}${
          selectedCustomer ? ` • Member: ${selectedCustomer.memberTier || 'Kelompok Tani'}` : ''
        }`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Deduct stock in IndexedDB
      await productRepo.deductStock(
        posItems.map((i) => ({ productId: i.product.id, quantity: i.quantity }))
      );

      // 2. Save order & log transaction in IndexedDB
      const saved = await orderRepo.save(newOrder);

      // 3. Refresh and trigger receipt
      await refreshData();
      setCompletedOrder(saved);
      showToast('Transaksi kasir berhasil disimpan!', 'success');
      clearPosCart();
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses transaksi kasir', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 bg-stone-100 min-h-screen flex flex-col">
      <AdminHeader
        title="Kasir Toko (Point of Sale)"
        subtitle="Kasir cepat kios pertanian dengan voucher personal per member dan klaim otomatis promo tanggal kembar terkontrol admin"
        action={
          <button
            type="button"
            onClick={openPromoConfigModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold transition shadow-2xs"
            title="Atur jadwal dan status aktif promo tanggal kembar"
          >
            <Settings className="w-4 h-4 text-emerald-700" />
            <span>Pengaturan Tanggal Kembar</span>
          </button>
        }
      />

      {/* Promo Bar Header Indicator with Admin Settings Status */}
      <div className="bg-emerald-950 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-emerald-200">Status Promosi Toko:</span>
          <span className="text-[11px] text-stone-300">
            ★ Member 15% (Kode Personal) • 🎉 Tanggal Kembar 5% (&gt; Rp {promoSettings.twinDateMinSpend.toLocaleString('id-ID')})
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Hari ini: {todayDay}.{todayMonth}</span>
            {isRealTwinDate ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[9px] uppercase">
                Tanggal Kembar Kalender!
              </span>
            ) : promoSettings.twinDateOverrideActive ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-stone-950 font-black text-[9px] uppercase">
                Override Admin Aktif
              </span>
            ) : (
              <span className="text-stone-400 font-normal">
                (Bukan Tgl Kembar - Promo Nonaktif)
              </span>
            )}
          </span>

          <button
            type="button"
            onClick={openPromoConfigModal}
            className="text-[10px] text-emerald-300 hover:text-white underline font-semibold flex items-center gap-1"
          >
            <span>Ubah Pengaturan</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-7xl mx-auto w-full">
        {/* Left: Product Grid & Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Categories */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama atau kode barang (contoh: RoundUp, Inpari, NPK, Regent)..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:bg-white bg-stone-50"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
                  selectedCategory === 'ALL'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Semua ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.name)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
                    selectedCategory === c.name
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((p) => {
              const isOutOfStock = p.stock <= 0;
              const cartItem = posItems.find((i) => i.product.id === p.id);
              const isLowStock = p.stock <= p.minStock && p.stock > 0;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddToCart(p)}
                  disabled={isOutOfStock}
                  className={`relative p-3 rounded-2xl border text-left flex flex-col justify-between transition group bg-white shadow-2xs ${
                    isOutOfStock
                      ? 'opacity-50 cursor-not-allowed border-stone-200'
                      : 'border-stone-200 hover:border-emerald-500 hover:shadow-xs active:scale-98'
                  }`}
                >
                  <div>
                    <div className="aspect-4/3 rounded-lg overflow-hidden bg-stone-100 mb-2 relative">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        onError={(e) => handleProductImageError(e, p.category, p.name)}
                      />
                      <span className="absolute top-1 left-1 bg-stone-900/80 text-white text-[9px] font-mono px-1.5 py-0.2 rounded">
                        {p.code}
                      </span>
                      {cartItem && (
                        <span className="absolute top-1 right-1 bg-emerald-700 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                          {cartItem.quantity}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-stone-900 line-clamp-2 leading-snug">
                      {p.name}
                    </h4>
                  </div>

                  <div className="mt-2 pt-2 border-t border-stone-100 flex items-baseline justify-between">
                    <span className="text-xs font-black text-emerald-800 font-mono">
                      {formatRupiah(p.price)}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        isOutOfStock
                          ? 'text-rose-600'
                          : isLowStock
                          ? 'text-amber-600'
                          : 'text-stone-400'
                      }`}
                    >
                      {isOutOfStock ? 'Habis' : `Stok: ${p.stock}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Cashier Cart, Vouchers & Payment Terminal (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4 sticky top-6">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-stone-900 text-sm">Pesanan Kasir</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {posItems.reduce((s, i) => s + i.quantity, 0)} item
              </span>
            </div>

            {posItems.length > 0 && (
              <button
                type="button"
                onClick={clearPosCart}
                className="text-[11px] text-stone-400 hover:text-rose-600 font-semibold"
              >
                Reset Keranjang
              </button>
            )}
          </div>

          {/* Customer Selection & Membership Detection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <label className="text-[11px] font-semibold text-stone-600">Pelanggan Kasir:</label>
              <div className="flex items-center gap-1.5">
                {customerHasMemberVoucher ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-700" />
                    <span>Voucher 15% Aktif</span>
                  </span>
                ) : selectedCustomerId !== 'guest' ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-500">
                    Belum Diberi Voucher
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate('/admin/customers?action=new')}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition shadow-2xs"
                  title="Daftarkan petani baru di menu Data Pelanggan"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>+ Daftar Petani</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs border border-stone-200 rounded-lg p-2 bg-stone-50 focus:outline-hidden font-medium"
              >
                <option value="guest">Umum / Walk-in (Non-Member)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.hasMemberVoucher !== false ? '★ [Voucher Aktif]' : ''}
                  </option>
                ))}
              </select>

              {selectedCustomerId === 'guest' ? (
                <input
                  type="text"
                  value={customCustomerName}
                  onChange={(e) => setCustomCustomerName(e.target.value)}
                  placeholder="Ketik nama walk-in (opsional)"
                  className="w-full text-xs border border-stone-200 rounded-lg p-2 bg-stone-50 focus:outline-hidden"
                />
              ) : (
                <div className="text-[11px] text-stone-700 flex items-center justify-between px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 truncate">
                  <span className="truncate">{selectedCustomer?.farmerGroup || 'Member'}</span>
                  {selectedCustomer?.memberVoucherCode && (
                    <span className="font-mono text-[10px] font-bold text-emerald-800 shrink-0 ml-1">
                      {selectedCustomer.memberVoucherCode}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cart Item List */}
          <div className="border border-stone-100 rounded-xl divide-y divide-stone-100 max-h-44 overflow-y-auto pr-1">
            {posItems.length === 0 ? (
              <div className="p-6 text-center text-stone-400 text-xs">
                <ShoppingCart className="w-7 h-7 mx-auto mb-1 text-stone-300" />
                <span>Belum ada item dipilih dari katalog</span>
              </div>
            ) : (
              posItems.map((item) => (
                <div key={item.product.id} className="p-2 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 text-xs truncate">
                      {item.product.name}
                    </p>
                    <p className="text-[10px] text-stone-500 font-mono">
                      {formatRupiah(item.product.price)} x {item.quantity} {item.product.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center border border-stone-200 rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="px-1.5 py-0.5 text-stone-600 hover:bg-stone-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-stone-800">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="px-1.5 py-0.5 text-stone-600 hover:bg-stone-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs font-bold text-stone-900 w-16 text-right font-mono">
                      {formatRupiah(item.product.price * item.quantity)}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 0)}
                      className="text-stone-300 hover:text-rose-600 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* VOUCHER & PROMO CONTROLS SECTION */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-emerald-700" />
                <span>Voucher & Promo Toko</span>
              </span>
              <span className="text-[10px] text-stone-500 font-medium">Klaim otomatis & personal</span>
            </div>

            {/* 1. Member 15% Voucher Box - Unique Personal Code */}
            <div
              onClick={() => {
                if (!customerHasMemberVoucher) {
                  showToast(
                    selectedCustomerId === 'guest'
                      ? 'Pilih pelanggan member terlebih dahulu'
                      : 'Pelanggan ini belum diberikan hak voucher member oleh Admin di menu Data Pelanggan',
                    'info'
                  );
                  return;
                }
                setApplyMemberDiscount(!applyMemberDiscount);
              }}
              className={`p-2.5 rounded-lg border transition ${
                customerHasMemberVoucher
                  ? applyMemberDiscount
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs cursor-pointer'
                    : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700 cursor-pointer'
                  : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {customerHasMemberVoucher ? (
                    <input
                      type="checkbox"
                      checked={applyMemberDiscount}
                      readOnly
                      className="rounded text-emerald-700 w-3.5 h-3.5 pointer-events-none"
                    />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-stone-400" />
                  )}
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>Voucher Member 15%</span>
                      {customerHasMemberVoucher && customerPersonalVoucherCode && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-700 text-white text-[9px] font-mono font-bold">
                          {customerPersonalVoucherCode}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      {customerHasMemberVoucher ? (
                        <span>Kode unik personal member: <strong>{customerPersonalVoucherCode}</strong></span>
                      ) : (
                        <span>Belum diberikan hak voucher oleh Admin di menu Data Pelanggan</span>
                      )}
                    </div>
                  </div>
                </div>

                {applyMemberDiscount && customerHasMemberVoucher && (
                  <span className="font-black text-xs text-emerald-800 font-mono">
                    -{formatRupiah(memberDiscountAmount)}
                  </span>
                )}
              </div>
            </div>

            {/* 2. Tanggal Kembar 5% Voucher Box - Auto-Claimed Only on Twin Date */}
            <div
              className={`p-2.5 rounded-lg border transition ${
                isTwinDateActiveNow
                  ? isTwinDateSpendEligible
                    ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-2xs'
                    : 'bg-white border-amber-300 text-stone-700'
                  : 'bg-stone-100 border-stone-200 text-stone-400 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                    isTwinDateActiveNow && isTwinDateSpendEligible ? 'bg-amber-500 text-white' : 'bg-stone-300 text-white'
                  }`}>
                    {isTwinDateActiveNow && isTwinDateSpendEligible && <Check className="w-2.5 h-2.5" />}
                  </div>

                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>Promo Tanggal Kembar 5%</span>
                      {isTwinDateActiveNow && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white text-[9px] font-mono">
                          Auto-Klaim
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-stone-500">
                      {!isTwinDateActiveNow ? (
                        <span className="text-stone-400">
                          Hanya aktif otomatis pada tanggal kembar (1.1, 2.2, dst.) yang disetujui Admin.
                        </span>
                      ) : isTwinDateSpendEligible ? (
                        <span className="text-emerald-700 font-bold">
                          ✓ Otomatis ter-klaim! Belanja &gt; {formatRupiah(promoSettings.twinDateMinSpend)}
                        </span>
                      ) : (
                        <span className="text-amber-800">
                          Belanja Rp {Math.max(0, promoSettings.twinDateMinSpend + 1 - subtotal).toLocaleString('id-ID')} lagi untuk otomatis klaim diskon 5%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {applyTwinDateDiscount && isTwinDateActiveNow && isTwinDateSpendEligible && (
                  <span className="font-black text-xs text-amber-900 font-mono">
                    -{formatRupiah(twinDateDiscountAmount)}
                  </span>
                )}
              </div>
            </div>

            {/* Input Kode Kupon Personal */}
            <div className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={couponCodeInput}
                onChange={(e) => setCouponCodeInput(e.target.value)}
                placeholder="Ketik kode kupon personal (misal: MBR-BUDI-892)"
                className="flex-1 px-2.5 py-1 text-xs border border-stone-200 rounded-lg bg-white uppercase font-mono focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleApplyCouponCode}
                className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg text-xs"
              >
                Terapkan
              </button>
            </div>
          </div>

          {/* Subtotal & Discount Breakdown */}
          <div className="space-y-1.5 text-xs pt-1 border-t border-stone-100">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal Belanja:</span>
              <span className="font-bold font-mono">{formatRupiah(subtotal)}</span>
            </div>

            {memberDiscountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Diskon Member (15%):</span>
                <span className="font-bold font-mono">-{formatRupiah(memberDiscountAmount)}</span>
              </div>
            )}

            {twinDateDiscountAmount > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>Diskon Tanggal Kembar (5%):</span>
                <span className="font-bold font-mono">-{formatRupiah(twinDateDiscountAmount)}</span>
              </div>
            )}

            {/* Manual Discount Field */}
            <div className="flex items-center justify-between text-stone-600 pt-0.5">
              <span>Potongan Manual Kasir (Rp):</span>
              <input
                type="number"
                min="0"
                value={manualDiscount || ''}
                onChange={(e) => setManualDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
                className="w-24 text-right px-2 py-0.5 border border-stone-200 rounded text-xs font-bold focus:outline-hidden"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5 pt-2 border-t border-stone-100">
            <label className="text-[11px] font-semibold text-stone-600">Metode Bayar:</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'CASH'
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Tunai</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('QRIS')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'QRIS'
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QRIS</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Transfer</span>
              </button>
            </div>
          </div>

          {/* Cash Change Calculator */}
          {paymentMethod === 'CASH' && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700">Uang Diterima:</span>
                <input
                  type="number"
                  min="0"
                  value={cashGiven || ''}
                  onChange={(e) => setCashGiven(parseInt(e.target.value) || 0)}
                  placeholder="Rp 0"
                  className="w-32 text-right px-2 py-1 border border-stone-300 rounded text-xs font-bold focus:outline-hidden bg-white"
                />
              </div>

              {/* Quick Money Buttons */}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setCashGiven(total)}
                  className="px-2 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-[10px] font-bold text-stone-800"
                >
                  Uang Pas
                </button>
                <button
                  type="button"
                  onClick={() => setCashGiven(50000)}
                  className="px-2 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-[10px] font-bold text-stone-800"
                >
                  50 rb
                </button>
                <button
                  type="button"
                  onClick={() => setCashGiven(100000)}
                  className="px-2 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-[10px] font-bold text-stone-800"
                >
                  100 rb
                </button>
                <button
                  type="button"
                  onClick={() => setCashGiven(200000)}
                  className="px-2 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-[10px] font-bold text-stone-800"
                >
                  200 rb
                </button>
                <button
                  type="button"
                  onClick={() => setCashGiven(500000)}
                  className="px-2 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-[10px] font-bold text-stone-800"
                >
                  500 rb
                </button>
              </div>

              <div className="flex justify-between items-baseline pt-1 text-xs">
                <span className="font-semibold text-stone-600">Kembalian:</span>
                <span
                  className={`font-black text-sm font-mono ${
                    cashGiven >= total ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {formatRupiah(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Total & Checkout Button */}
          <div className="pt-2 border-t border-stone-200 space-y-3">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-xs font-semibold text-stone-500 block">Total Akhir Tagihan:</span>
                {totalDiscount > 0 && (
                  <span className="text-[10px] text-emerald-700 font-bold">
                    Hemat {formatRupiah(totalDiscount)}
                  </span>
                )}
              </div>
              <span className="text-xl font-black text-emerald-800 font-mono">
                {formatRupiah(total)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleProcessTransaction}
              disabled={isProcessing || posItems.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Simpan & Selesaikan Transaksi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Settings Modal for Promo Tanggal Kembar */}
      <Modal
        isOpen={isPromoModalOpen}
        onClose={() => setIsPromoModalOpen(false)}
        title="⚙️ Pengaturan Promo Tanggal Kembar (Khusus Admin)"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-stone-900 block">Master Status Promo Tanggal Kembar</span>
                <span className="text-[10px] text-stone-500">
                  Aktifkan promo otomatis pada tanggal kembar (1.1, 2.2, 3.3, dst.)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tempTwinDateEnabled}
                  onChange={(e) => setTempTwinDateEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-700"></div>
              </label>
            </div>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-900 block">Mode Simulasi / Override Tanggal Kembar Hari Ini</span>
                <span className="text-[10px] text-stone-500">
                  Paksa aktifkan promo tanggal kembar hari ini untuk pengujian kios
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tempTwinDateOverride}
                  onChange={(e) => setTempTwinDateOverride(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Minimal Total Belanja untuk Mendapat Diskon 5% (Rp)
            </label>
            <input
              type="number"
              min="10000"
              step="10000"
              value={tempMinSpend}
              onChange={(e) => setTempMinSpend(parseInt(e.target.value) || 150000)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg font-bold text-stone-900 focus:outline-hidden"
            />
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              Default: Rp 150.000 (Sesuai instruksi: potongan 5% untuk belanja lebih dari 150.000)
            </span>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-[11px] leading-relaxed">
            <strong>Catatan Kebijakan:</strong> Hanya admin toko yang memiliki hak untuk mengubah konfigurasi ini. Pembeli dan kasir akan secara otomatis menerima potongan jika bertransaksi tepat pada tanggal kembar yang diaktifkan.
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsPromoModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl font-semibold hover:bg-stone-50 text-stone-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSavePromoSettings}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold shadow-xs"
            >
              Simpan Pengaturan Admin
            </button>
          </div>
        </div>
      </Modal>

      {/* Digital Thermal Receipt Modal with PDF/PNG/Print */}
      <ReceiptModal
        isOpen={!!completedOrder}
        onClose={() => setCompletedOrder(null)}
        order={completedOrder}
      />
    </div>
  );
};
