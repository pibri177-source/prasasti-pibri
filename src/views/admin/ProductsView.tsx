import React, { useState, useMemo } from 'react';
import { useApp, formatRupiah } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import { handleProductImageError } from '../../utils/productImages';
import { productRepo } from '../../services/db';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Modal } from '../../components/common/Modal';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Percent,
  Sparkles,
  Zap,
  Boxes,
  ArrowUpDown,
  RotateCcw,
  History,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';

const PRESET_IMAGES = [
  {
    name: 'Herbisida / Botol Semprot',
    url: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Fungisida Serbuk / Daun Sehat',
    url: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Benih Padi Pilihan',
    url: 'https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Benih Jagung Tongkol Emas',
    url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Benih Cabai Rawit Merah',
    url: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Pupuk Majemuk NPK Butiran',
    url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Pupuk Hayati Cair Probiotik',
    url: 'https://images.unsplash.com/photo-1598512752271-33f913a5af13?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Pupuk Daun & Nutrisi Tanaman',
    url: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=800&q=80',
  },
];

export const ProductsView: React.FC = () => {
  const { products, categories, refreshData, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterStockTab, setFilterStockTab] = useState<'ALL' | 'LOW' | 'OUT' | 'NON_3_PERCENT'>('ALL');

  // Form Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Form inputs
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Obat & Pestisida');
  const [price, setPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [autoRatio3Percent, setAutoRatio3Percent] = useState<boolean>(true);
  const [stock, setStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(5);
  const [unit, setUnit] = useState('Botol 500ml');
  const [description, setDescription] = useState('');
  const [usageInstructions, setUsageInstructions] = useState('');
  const [targetPests, setTargetPests] = useState('');
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);

  // Bulk 3% Ratio Modal State
  const [isBulkRatioModalOpen, setIsBulkRatioModalOpen] = useState(false);
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  // Stock Opname / Custom Adjustment Modal State
  const [opnameProduct, setOpnameProduct] = useState<Product | null>(null);
  const [opnameQtyChange, setOpnameQtyChange] = useState<number>(0);
  const [opnameReason, setOpnameReason] = useState<string>('Restock Supplier');

  // Calculations for Auto 3% Profit Ratio: Selling Price = Cost Price + 3% of Cost Price
  const calculate3PercentPrice = (cost: number) => {
    return Math.round(cost * 1.03);
  };

  const handleCostPriceChange = (val: number) => {
    const newCost = Math.max(0, val);
    setCostPrice(newCost);
    if (autoRatio3Percent && newCost > 0) {
      setPrice(calculate3PercentPrice(newCost));
    }
  };

  const apply3PercentInForm = () => {
    if (costPrice <= 0) {
      showToast('Masukkan harga modal terlebih dahulu', 'error');
      return;
    }
    const targetPrice = calculate3PercentPrice(costPrice);
    setPrice(targetPrice);
    showToast(`Harga jual disesuaikan ke ${formatRupiah(targetPrice)} (Rasio Profit +3%)`, 'success');
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    const randCode = 'PRD-' + Math.floor(100 + Math.random() * 900);
    setCode(randCode);
    setName('');
    setCategory('Obat & Pestisida');
    const defaultCost = 50000;
    setCostPrice(defaultCost);
    setPrice(calculate3PercentPrice(defaultCost)); // Auto 3% profit ratio
    setAutoRatio3Percent(true);
    setStock(20);
    setMinStock(5);
    setUnit('Botol 500ml');
    setDescription('');
    setUsageInstructions('');
    setTargetPests('');
    setImageUrl(PRESET_IMAGES[0].url);
    setIsFormModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setCategory(p.category);
    setPrice(p.price);
    setCostPrice(p.costPrice);
    // Check if current price is approx 3% profit
    const expected3Pct = calculate3PercentPrice(p.costPrice);
    setAutoRatio3Percent(Math.abs(p.price - expected3Pct) <= 100);
    setStock(p.stock);
    setMinStock(p.minStock);
    setUnit(p.unit);
    setDescription(p.description);
    setUsageInstructions(p.usageInstructions || '');
    setTargetPests(p.targetPests || '');
    setImageUrl(p.imageUrl);
    setIsFormModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Nama produk wajib diisi', 'error');
      return;
    }

    if (price <= 0) {
      showToast('Harga jual harus lebih dari 0', 'error');
      return;
    }

    try {
      const now = new Date().toISOString();
      const productPayload: Product = {
        id: editingProduct ? editingProduct.id : 'prod-' + Date.now(),
        code: code.trim().toUpperCase(),
        name: name.trim(),
        category,
        price,
        costPrice: costPrice || Math.round(price / 1.03),
        stock: Number(stock),
        minStock: Number(minStock),
        unit: unit.trim() || 'Unit',
        description: description.trim(),
        usageInstructions: usageInstructions.trim() || undefined,
        targetPests: targetPests.trim() || undefined,
        imageUrl: imageUrl.trim() || PRESET_IMAGES[0].url,
        isActive: true,
        createdAt: editingProduct ? editingProduct.createdAt : now,
        updatedAt: now,
      };

      await productRepo.save(productPayload);
      await refreshData();
      setIsFormModalOpen(false);
      showToast(
        editingProduct ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil ditambahkan!',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan produk ke IndexedDB', 'error');
    }
  };

  const executeDeleteProduct = async (p: Product) => {
    try {
      await productRepo.delete(p.id);
      await refreshData();
      showToast(`Produk "${p.name}" berhasil dihapus`, 'info');
      setDeletingProduct(null);
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus produk', 'error');
    }
  };

  const handleAdjustStock = async (p: Product, delta: number) => {
    const newStock = Math.max(0, p.stock + delta);
    try {
      await productRepo.adjustStock(p.id, newStock);
      await refreshData();
      showToast(`Stok ${p.name} kini: ${newStock} ${p.unit}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal memperbarui stok', 'error');
    }
  };

  // Quick 1-click apply 3% profit ratio for an individual product in table
  const handleQuickSnapTo3Percent = async (p: Product) => {
    const targetPrice = calculate3PercentPrice(p.costPrice);
    try {
      await productRepo.save({
        ...p,
        price: targetPrice,
        updatedAt: new Date().toISOString(),
      });
      await refreshData();
      showToast(`Harga jual ${p.name} diubah ke ${formatRupiah(targetPrice)} (+3% profit)`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal memperbarui harga produk', 'error');
    }
  };

  // Bulk Apply 3% Profit Ratio to All Products
  const handleApplyBulk3Percent = async () => {
    setIsBulkApplying(true);
    try {
      const updatedProducts = products.map((p) => ({
        ...p,
        price: calculate3PercentPrice(p.costPrice),
        updatedAt: new Date().toISOString(),
      }));

      await productRepo.batchSave(updatedProducts);
      await refreshData();
      setIsBulkRatioModalOpen(false);
      showToast(
        `Sukses! Seluruh ${products.length} produk kini memiliki rasio profit 3% dari harga beli!`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Gagal menerapkan rasio profit massal', 'error');
    } finally {
      setIsBulkApplying(false);
    }
  };

  // Submit Opname Modal
  const handleSaveOpname = async () => {
    if (!opnameProduct) return;
    const finalStock = Math.max(0, opnameProduct.stock + opnameQtyChange);
    try {
      await productRepo.adjustStock(opnameProduct.id, finalStock);
      await refreshData();
      showToast(
        `Stok ${opnameProduct.name} disesuaikan (${opnameReason}): ${finalStock} ${opnameProduct.unit}`,
        'success'
      );
      setOpnameProduct(null);
    } catch (e) {
      console.error(e);
      showToast('Gagal menyimpan penyesuaian stok', 'error');
    }
  };

  // Inventory Totals & Metrics
  const totalStockUnits = useMemo(() => products.reduce((s, p) => s + p.stock, 0), [products]);
  const totalInventoryCost = useMemo(
    () => products.reduce((s, p) => s + p.costPrice * p.stock, 0),
    [products]
  );
  const totalInventoryPotentialRevenue = useMemo(
    () => products.reduce((s, p) => s + p.price * p.stock, 0),
    [products]
  );
  const potentialProfit = Math.max(0, totalInventoryPotentialRevenue - totalInventoryCost);
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock <= p.minStock && p.stock > 0).length,
    [products]
  );
  const outOfStockCount = useMemo(() => products.filter((p) => p.stock <= 0).length, [products]);
  const non3PercentCount = useMemo(() => {
    return products.filter((p) => {
      const expected = calculate3PercentPrice(p.costPrice);
      return Math.abs(p.price - expected) > 100;
    }).length;
  }, [products]);

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;

      if (filterStockTab === 'LOW' && (p.stock > p.minStock || p.stock <= 0)) return false;
      if (filterStockTab === 'OUT' && p.stock > 0) return false;
      if (filterStockTab === 'NON_3_PERCENT') {
        const expected = calculate3PercentPrice(p.costPrice);
        if (Math.abs(p.price - expected) <= 100) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, filterStockTab, searchQuery]);

  return (
    <div className="flex-1 min-w-0 bg-stone-50 min-h-screen">
      <AdminHeader
        title="Inventori Stok & Pengaturan Harga"
        subtitle="Manajemen stok produk, opname gudang, dan pengaturan harga jual dengan rasio profit 3% otomatis"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkRatioModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition shadow-2xs"
              title="Atur harga jual semua produk otomatis 3% di atas harga beli"
            >
              <Zap className="w-3.5 h-3.5 text-amber-700" />
              <span>Auto Rasio Profit 3% Semua</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          </div>
        }
      />

      <main className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
        {/* Inventory Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                Total Stok Fisik
              </div>
              <div className="text-lg font-black text-stone-900">
                {totalStockUnits.toLocaleString('id-ID')} <span className="text-xs font-normal text-stone-500">unit</span>
              </div>
              <div className="text-[10px] text-stone-400 font-medium">Dari {products.length} SKU aktif</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                Nilai Aset Modal
              </div>
              <div className="text-lg font-black text-stone-900">
                {formatRupiah(totalInventoryCost)}
              </div>
              <div className="text-[10px] text-stone-400 font-medium">Harga beli dari distributor</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                Estimasi Profit (+3%)
              </div>
              <div className="text-lg font-black text-emerald-800">
                +{formatRupiah(potentialProfit)}
              </div>
              <div className="text-[10px] text-amber-700 font-medium">
                Omzet: {formatRupiah(totalInventoryPotentialRevenue)}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              outOfStockCount > 0 || lowStockCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-stone-50 text-stone-600'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                Status Stok Gudang
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${lowStockCount > 0 ? 'text-amber-700' : 'text-stone-700'}`}>
                  {lowStockCount} Menipis
                </span>
                <span className="text-stone-300">•</span>
                <span className={`text-sm font-bold ${outOfStockCount > 0 ? 'text-rose-700' : 'text-stone-700'}`}>
                  {outOfStockCount} Habis
                </span>
              </div>
              <div className="text-[10px] text-stone-400 font-medium">Batas minimum terpantau</div>
            </div>
          </div>
        </div>

        {/* 3% Auto Ratio Highlight Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-stone-900 text-white p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-emerald-100">
                  Fitur Otomatis: Auto Ratio Profit Harga Jual 3% dari Harga Beli
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400 text-stone-950 uppercase">
                  Aktif
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
                Formula otomatis: <span className="font-mono font-bold text-emerald-300">Harga Jual = Harga Beli + (3% x Harga Beli)</span>. Setiap Anda mengisi harga modal, sistem langsung menghitung harga jual rekomendasi secara presisi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsBulkRatioModalOpen(true)}
            className="shrink-0 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sinkronkan 3% Semua ({non3PercentCount} belum 3%)</span>
          </button>
        </div>

        {/* Search, Filter Tabs & Category Filter */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama produk, kode SKU (contoh: OBT-001, Inpari, Roundup)..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-stone-50"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs font-semibold border border-stone-200 rounded-xl px-3 py-2 bg-stone-50 text-stone-800 focus:outline-hidden"
              >
                <option value="ALL">Semua Kategori ({products.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium border-t border-stone-100 pt-2.5">
            <button
              type="button"
              onClick={() => setFilterStockTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
                filterStockTab === 'ALL'
                  ? 'bg-stone-900 text-white font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Semua Produk ({products.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterStockTab('LOW')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                filterStockTab === 'LOW'
                  ? 'bg-amber-700 text-white font-bold'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Stok Menipis ({lowStockCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStockTab('OUT')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                filterStockTab === 'OUT'
                  ? 'bg-rose-700 text-white font-bold'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              <span>Stok Habis ({outOfStockCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStockTab('NON_3_PERCENT')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                filterStockTab === 'NON_3_PERCENT'
                  ? 'bg-emerald-800 text-white font-bold'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Rasio Belum 3% ({non3PercentCount})</span>
            </button>
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Produk & SKU</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3 text-right">Harga Beli (Modal)</th>
                  <th className="py-3 px-3 text-right">Harga Jual</th>
                  <th className="py-3 px-3 text-center">Margin / Rasio Profit</th>
                  <th className="py-3 px-3 text-center">Stok Gudang</th>
                  <th className="py-3 px-3 text-center">Aksi Cepat Stok</th>
                  <th className="py-3 px-4 text-right">Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      <Package className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                      <p className="font-medium text-xs">Tidak ada produk ditemukan sesuai filter</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLow = p.stock <= p.minStock && p.stock > 0;
                    const isOut = p.stock <= 0;
                    const profitNominal = p.price - p.costPrice;
                    const profitPercentage = p.costPrice > 0 ? (profitNominal / p.costPrice) * 100 : 0;
                    const isExact3Percent = Math.abs(profitPercentage - 3.0) < 0.2;

                    return (
                      <tr key={p.id} className="hover:bg-stone-50/70 transition">
                        {/* Product details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-11 h-11 rounded-xl object-cover bg-stone-100 border border-stone-200 shrink-0"
                              onError={(e) => handleProductImageError(e, p.category, p.name)}
                            />
                            <div>
                              <div className="font-mono text-[10px] text-stone-400 font-bold">
                                {p.code}
                              </div>
                              <div className="font-bold text-stone-900 text-xs line-clamp-1">{p.name}</div>
                              <div className="text-[11px] text-stone-500">Satuan: {p.unit}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-medium text-emerald-800">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 text-[11px] font-semibold">
                            {p.category}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-medium text-stone-500 font-mono">
                          {formatRupiah(p.costPrice)}
                        </td>

                        <td className="py-3 px-3 text-right font-black text-stone-900 font-mono">
                          {formatRupiah(p.price)}
                        </td>

                        {/* Profit Margin & 3% Ratio status */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                                isExact3Percent
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : profitPercentage >= 3
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : 'bg-amber-50 text-amber-900 border border-amber-200'
                              }`}
                            >
                              {isExact3Percent && <Check className="w-3 h-3 text-emerald-700" />}
                              <span>+{profitPercentage.toFixed(1)}%</span>
                              <span className="text-[9px] font-normal opacity-75">
                                (+{formatRupiah(profitNominal)})
                              </span>
                            </span>

                            {!isExact3Percent && (
                              <button
                                type="button"
                                onClick={() => handleQuickSnapTo3Percent(p)}
                                className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-0.5"
                                title={`Set harga ke ${formatRupiah(calculate3PercentPrice(p.costPrice))} (+3%)`}
                              >
                                <Zap className="w-2.5 h-2.5" />
                                <span>Set ke 3%</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Stock badge */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                              isOut
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : isLow
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            }`}
                          >
                            {isOut ? (
                              <X className="w-3 h-3" />
                            ) : isLow ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            {p.stock} {p.unit}
                          </span>
                        </td>

                        {/* Quick stock adjustment buttons */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(p, -1)}
                              disabled={p.stock <= 0}
                              className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold disabled:opacity-40"
                              title="Kurangi 1"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(p, 1)}
                              className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold"
                              title="Tambah 1"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(p, 10)}
                              className="px-1.5 h-6 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold"
                              title="Restock +10"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpnameProduct(p);
                                setOpnameQtyChange(0);
                                setOpnameReason('Restock Supplier');
                              }}
                              className="px-1.5 h-6 rounded bg-stone-200 hover:bg-stone-300 text-stone-800 text-[10px] font-semibold"
                              title="Stock Opname Khusus"
                            >
                              Opname
                            </button>
                          </div>
                        </td>

                        {/* Edit / Delete */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="p-1.5 rounded-lg text-stone-600 hover:text-emerald-700 hover:bg-stone-100 transition"
                              title="Edit Produk & Pengaturan Harga"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingProduct(p)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Hapus Produk"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Form Add / Edit Modal with Auto 3% Profit Ratio Control */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingProduct ? 'Edit Informasi Produk & Pengaturan Harga' : 'Tambah Produk Pertanian Baru'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Kode SKU / Barcode *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Contoh: OBT-009"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Nama Produk Lengkap *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Score 250 EC Fungisida"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Kategori Produk *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Kemasan / Satuan *</label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Botol 250ml / Kantong 5kg / Sachet"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          {/* Pricing Settings with Auto 3% Profit Ratio Highlight */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-stone-900 text-xs">
                  Pengaturan Harga & Auto Ratio Profit 3%
                </span>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-emerald-900">
                <input
                  type="checkbox"
                  checked={autoRatio3Percent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoRatio3Percent(checked);
                    if (checked && costPrice > 0) {
                      setPrice(calculate3PercentPrice(costPrice));
                    }
                  }}
                  className="rounded text-emerald-700 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span>Auto Sinkronisasi +3% dari Modal</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Harga Beli / Modal Distributor (Rp) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={costPrice || ''}
                  onChange={(e) => handleCostPriceChange(parseInt(e.target.value) || 0)}
                  placeholder="Contoh: 100000"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden font-bold text-stone-900 bg-white"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  Harga kulakan / modal beli dari distributor
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-stone-700">Harga Jual Kios (Rp) *</label>
                  <button
                    type="button"
                    onClick={apply3PercentInForm}
                    className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                  >
                    ⚡ Hitung 3% (Rp {calculate3PercentPrice(costPrice).toLocaleString('id-ID')})
                  </button>
                </div>
                <input
                  type="number"
                  min="100"
                  required
                  value={price || ''}
                  onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                  placeholder="Contoh: 103000"
                  className="w-full px-3 py-2 border border-emerald-400 rounded-lg focus:outline-hidden font-black text-emerald-800 bg-white"
                />
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  Harga jual ke pelanggan / anggota kelompok tani
                </span>
              </div>
            </div>

            {/* Profit Margin Preview Card */}
            {costPrice > 0 && price > 0 && (
              <div className="p-2.5 bg-white rounded-lg border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="text-stone-600">
                  Modal: <strong className="text-stone-900">{formatRupiah(costPrice)}</strong>
                </div>
                <div className="text-stone-600">
                  Keuntungan: <strong className="text-emerald-700">+{formatRupiah(price - costPrice)}</strong>
                </div>
                <div className="flex items-center gap-1 font-bold">
                  <span>Rasio Profit:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      Math.abs(((price - costPrice) / costPrice) * 100 - 3) < 0.2
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-stone-100 text-stone-800'
                    }`}
                  >
                    {(((price - costPrice) / costPrice) * 100).toFixed(2)}%
                    {Math.abs(((price - costPrice) / costPrice) * 100 - 3) < 0.2 && ' (Sesuai 3%)'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Stok Gudang Awal *</label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Batas Minimum Stok Menipis</label>
              <input
                type="number"
                min="1"
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Deskripsi & Keunggulan Produk</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan bahan aktif, efektivitas, dan kelebihan produk..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Dosis / Aturan Pakai</label>
              <input
                type="text"
                value={usageInstructions}
                onChange={(e) => setUsageInstructions(e.target.value)}
                placeholder="Contoh: 1-2 ml per liter air tangki 16L"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Sasaran Hama / Tanaman</label>
              <input
                type="text"
                value={targetPests}
                onChange={(e) => setTargetPests(e.target.value)}
                placeholder="Contoh: Wereng coklat, ulat grayak, padi & jagung"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          {/* Image URL & Presets */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">URL Gambar Produk</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden text-xs"
            />

            <div className="mt-2">
              <span className="text-[11px] font-semibold text-stone-500">
                Atau pilih dari galeri gambar bawaan:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                {PRESET_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className={`p-1.5 rounded-lg border text-left flex items-center gap-2 transition ${
                      imageUrl === preset.url
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-7 h-7 rounded object-cover shrink-0"
                    />
                    <span className="text-[10px] truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl font-semibold hover:bg-stone-50 text-stone-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editingProduct ? 'Perbarui Produk' : 'Simpan Produk'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Apply 3% Ratio Modal */}
      <Modal
        isOpen={isBulkRatioModalOpen}
        onClose={() => setIsBulkRatioModalOpen(false)}
        title="⚡ Terapkan Auto Rasio Profit 3% ke Semua Produk"
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950">
            <p className="font-semibold leading-relaxed">
              Tindakan ini akan menghitung ulang seluruh harga jual produk aktif menjadi <strong>Harga Beli + 3% margin profit</strong> secara otomatis.
            </p>
            <p className="text-[11px] text-amber-800 mt-1">
              Contoh: Harga Beli Rp 100.000 → Harga Jual Baru menjadi Rp 103.000 (+Rp 3.000 keuntungan per unit).
            </p>
          </div>

          <div className="border border-stone-200 rounded-xl max-h-60 overflow-y-auto divide-y divide-stone-100">
            {products.map((p) => {
              const currentProfit = p.price - p.costPrice;
              const currentRatio = p.costPrice > 0 ? (currentProfit / p.costPrice) * 100 : 0;
              const newPrice = calculate3PercentPrice(p.costPrice);
              const isDifferent = p.price !== newPrice;

              return (
                <div key={p.id} className="p-2.5 flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 truncate">{p.name}</p>
                    <p className="text-stone-500 text-[10px]">
                      Modal: {formatRupiah(p.costPrice)} • Saat ini: {formatRupiah(p.price)} (+{currentRatio.toFixed(1)}%)
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-emerald-800 font-mono">
                      {formatRupiah(newPrice)}
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      {isDifferent ? (
                        <span className="text-amber-700 font-semibold">Penyesuaian</span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">Sudah 3%</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBulkRatioModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl font-semibold hover:bg-stone-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApplyBulk3Percent}
              disabled={isBulkApplying}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-emerald-300" />
              <span>
                {isBulkApplying
                  ? 'Menerapkan...'
                  : `Terapkan ke Semua (${products.length} SKU)`}
              </span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Stock Opname Modal */}
      {opnameProduct && (
        <Modal
          isOpen={!!opnameProduct}
          onClose={() => setOpnameProduct(null)}
          title={`Stock Opname: ${opnameProduct.name}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Kode SKU:</span>
                <span className="font-mono font-bold">{opnameProduct.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Stok Saat Ini:</span>
                <span className="font-bold text-stone-900">
                  {opnameProduct.stock} {opnameProduct.unit}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Perubahan Jumlah Stok (+ Tambah / - Kurang):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={opnameQtyChange}
                  onChange={(e) => setOpnameQtyChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-bold text-stone-900 focus:outline-hidden"
                />
                <span className="text-stone-500 font-semibold">{opnameProduct.unit}</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setOpnameQtyChange((prev) => prev - 5)}
                  className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-bold"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => setOpnameQtyChange((prev) => prev - 1)}
                  className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-bold"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => setOpnameQtyChange((prev) => prev + 1)}
                  className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-bold"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setOpnameQtyChange((prev) => prev + 10)}
                  className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-bold"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => setOpnameQtyChange((prev) => prev + 50)}
                  className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-bold"
                >
                  +50
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Alasan Penyesuaian:</label>
              <select
                value={opnameReason}
                onChange={(e) => setOpnameReason(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden bg-white"
              >
                <option value="Restock Supplier">Restock Masuk dari Distributor</option>
                <option value="Koreksi Stock Opname">Koreksi Fisik (Stock Opname Bulanan)</option>
                <option value="Barang Rusak / Kadaluarsa">Barang Rusak / Expired / Bocor</option>
                <option value="Retur Pelanggan">Retur Pengembalian Pelanggan</option>
              </select>
            </div>

            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center text-xs">
              <span className="text-emerald-900 font-semibold">Stok Akhir Nanti:</span>
              <span className="font-black text-emerald-900">
                {Math.max(0, opnameProduct.stock + opnameQtyChange)} {opnameProduct.unit}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setOpnameProduct(null)}
                className="px-3.5 py-1.5 border border-stone-300 rounded-xl font-semibold hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveOpname}
                className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold shadow-xs"
              >
                Simpan Penyesuaian
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <Modal
          isOpen={!!deletingProduct}
          onClose={() => setDeletingProduct(null)}
          title="Konfirmasi Hapus Produk"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-stone-700 leading-relaxed">
              Yakin ingin menghapus produk <strong>"{deletingProduct.name}"</strong> ({deletingProduct.code}) dari database lokal? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-3 py-1.5 border border-stone-300 rounded-xl font-semibold hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteProduct(deletingProduct)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs"
              >
                Hapus Produk
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
