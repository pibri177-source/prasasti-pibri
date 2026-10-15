import React, { useState, useMemo } from 'react';
import { useApp, formatRupiah } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import { handleProductImageError } from '../../utils/productImages';
import { ProductDetailModal } from './ProductDetailModal';
import {
  Search,
  ShoppingCart,
  Eye,
  SlidersHorizontal,
  Sprout,
  ShieldAlert,
  Sparkles,
  Check,
  AlertTriangle,
  Layers,
} from 'lucide-react';

export const MarketplaceHome: React.FC = () => {
  const { products, categories, addToCart, cart } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'POPULAR' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME_ASC' | 'STOCK_DESC'>('POPULAR');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [activeProductModal, setActiveProductModal] = useState<Product | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  // Filter & Sort
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (!p.isActive) return false;
        if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
        if (onlyInStock && p.stock <= 0) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCode = p.code.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchPests = p.targetPests?.toLowerCase().includes(q) || false;
          if (!matchName && !matchCode && !matchDesc && !matchPests) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'PRICE_ASC') return a.price - b.price;
        if (sortBy === 'PRICE_DESC') return b.price - a.price;
        if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
        if (sortBy === 'STOCK_DESC') return b.stock - a.stock;
        return 0; // Default order
      });
  }, [products, selectedCategory, searchQuery, sortBy, onlyInStock]);

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.stock <= 0) return;
    const ok = addToCart(product, 1);
    if (ok) {
      setAddedProductId(product.id);
      setTimeout(() => setAddedProductId(null), 1200);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: products.length };
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  return (
    <div className="min-h-screen pb-16">
      {/* Agricultural Hero Banner */}
      <section className="relative bg-gradient-to-br from-emerald-900 via-stone-900 to-emerald-950 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-4">
              <Sprout className="w-4 h-4 text-emerald-400" />
              <span>Kios Sarana Produksi Pertanian (SAPROTAN)</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Obat & Bibit Pertanian Berkualitas untuk Hasil Panen Melimpah
            </h1>

            <p className="mt-3 text-stone-300 text-sm sm:text-base leading-relaxed">
              Penyedia resmi herbisida, insektisida, fungisida paten, pupuk hayati & majemuk, serta benih bersertifikat dengan harga ramah petani.
            </p>

            {/* Quick stats in hero */}
            <div className="mt-6 flex flex-wrap gap-6 pt-6 border-t border-emerald-800/60 text-xs">
              <div>
                <span className="block text-xl font-black text-emerald-400">100%</span>
                <span className="text-stone-400">Produk Resmi & Berizin</span>
              </div>
              <div>
                <span className="block text-xl font-black text-emerald-400">{products.length}+</span>
                <span className="text-stone-400">Pilihan Produk Lengkap</span>
              </div>
              <div>
                <span className="block text-xl font-black text-emerald-400">Cepat</span>
                <span className="text-stone-400">Pengiriman Kelompok Tani</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Search, Filter & Categories Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-stone-200/80 p-5 space-y-4">
          {/* Search bar & Sort Controls */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari obat hama, herbisida, benih padi, tomat, pupuk NPK..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sorting & Filter In Stock */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
                <span className="text-stone-500 font-medium">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent font-semibold text-stone-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="POPULAR">Rekomendasi</option>
                  <option value="PRICE_ASC">Harga: Termurah</option>
                  <option value="PRICE_DESC">Harga: Termahal</option>
                  <option value="NAME_ASC">Nama (A - Z)</option>
                  <option value="STOCK_DESC">Stok Terbanyak</option>
                </select>
              </div>

              <label className="flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 cursor-pointer select-none hover:bg-stone-100 transition">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Hanya yang Tersedia</span>
              </label>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-stone-100 pt-3 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Produk ({categoryCounts['ALL'] || 0})</span>
            </button>

            {categories.map((cat) => {
              const count = categoryCounts[cat.name] || 0;
              let Icon = Sprout;
              if (cat.name === 'Obat & Pestisida') Icon = ShieldAlert;
              if (cat.name === 'Pupuk & Nutrisi') Icon = Sparkles;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                    selectedCategory === cat.name
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>
                    {cat.name} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>


        {/* Product Cards Grid */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span>Katalog Barang Tersedia</span>
              <span className="text-xs font-normal text-stone-500">
                ({filteredProducts.length} produk ditemukan)
              </span>
            </h2>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <Sprout className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-stone-800">Tidak ada produk yang cocok</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Coba gunakan kata kunci pencarian lain atau pilih kategori Semua Produk.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setOnlyInStock(false);
                }}
                className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition"
              >
                Reset Filter Pencarian
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= product.minStock;
                const inCart = cart.find((i) => i.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => setActiveProductModal(product)}
                    className="group bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-300 transition duration-200 flex flex-col cursor-pointer"
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                        onError={(e) => handleProductImageError(e, product.category, product.name)}
                      />

                      {/* Code Badge */}
                      <span className="absolute top-2.5 left-2.5 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded">
                        {product.code}
                      </span>

                      {/* Stock Warning Tag */}
                      {isOutOfStock ? (
                        <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center text-white font-bold text-xs uppercase tracking-wider">
                          Stok Habis
                        </div>
                      ) : isLowStock ? (
                        <span className="absolute bottom-2.5 left-2.5 bg-amber-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 shadow-xs">
                          <AlertTriangle className="w-3 h-3" />
                          Sisa {product.stock} {product.unit}
                        </span>
                      ) : null}

                      {/* In Cart Indicator */}
                      {inCart && (
                        <span className="absolute top-2.5 right-2.5 bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                          {inCart.quantity} di keranjang
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 mb-1">
                          {product.category}
                        </div>

                        <h3 className="font-bold text-stone-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-emerald-900 transition">
                          {product.name}
                        </h3>

                        <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-100">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <div className="text-base font-black text-emerald-900">
                              {formatRupiah(product.price)}
                            </div>
                            <div className="text-[10px] text-stone-400">
                              Satuan: {product.unit}
                            </div>
                          </div>

                          <span className="text-[11px] text-stone-500">
                            Stok: <strong className="text-stone-800">{product.stock}</strong>
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-3 grid grid-cols-5 gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveProductModal(product);
                            }}
                            className="col-span-2 py-1.5 px-2 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-[11px] font-medium flex items-center justify-center gap-1 transition"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Detail</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleQuickAdd(product, e)}
                            disabled={isOutOfStock}
                            className="col-span-3 py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                          >
                            {addedProductId === product.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-300" />
                                <span>Masuk!</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3 h-3" />
                                <span>+ Keranjang</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={activeProductModal}
        isOpen={!!activeProductModal}
        onClose={() => setActiveProductModal(null)}
      />
    </div>
  );
};
