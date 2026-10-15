import React, { useState } from 'react';
import { Product } from '../../types';
import { handleProductImageError } from '../../utils/productImages';
import { useApp, formatRupiah } from '../../context/AppContext';
import { Modal } from '../../components/common/Modal';
import { ShoppingCart, ShieldCheck, AlertTriangle, Plus, Minus, Check } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { addToCart, setIsCartDrawerOpen } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  if (!product) return null;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= product.minStock;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const ok = addToCart(product, quantity);
    if (ok) {
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 1500);
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    const ok = addToCart(product, quantity);
    if (ok) {
      onClose();
      setIsCartDrawerOpen(true);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Product Image */}
        <div className="relative rounded-xl overflow-hidden bg-stone-100 aspect-square border border-stone-200">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => handleProductImageError(e, product.category, product.name)}
          />
          <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded font-mono">
            {product.code}
          </div>
          {isOutOfStock ? (
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center text-white font-bold text-sm">
              Stok Habis
            </div>
          ) : isLowStock ? (
            <div className="absolute bottom-3 left-3 bg-amber-500 text-white text-xs px-2.5 py-0.5 rounded font-medium flex items-center gap-1 shadow-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              Sisa {product.stock} {product.unit}
            </div>
          ) : null}
        </div>

        {/* Product Info */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">
              {product.category}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 leading-snug">
              {product.name}
            </h2>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-800">
                {formatRupiah(product.price)}
              </span>
              <span className="text-xs text-stone-500 font-medium">/ {product.unit}</span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-stone-500">Ketersediaan Stok:</span>
              <span
                className={`font-semibold ${
                  isOutOfStock
                    ? 'text-rose-600'
                    : isLowStock
                    ? 'text-amber-600'
                    : 'text-emerald-700'
                }`}
              >
                {product.stock} {product.unit}
              </span>
            </div>

            {/* Description */}
            <div className="mt-4 pt-4 border-t border-stone-100 space-y-3 text-xs leading-relaxed text-stone-600">
              <p>{product.description}</p>

              {product.usageInstructions && (
                <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
                  <div className="font-semibold text-emerald-900 mb-0.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Dosis & Petunjuk Aplikasi:
                  </div>
                  <p className="text-stone-700">{product.usageInstructions}</p>
                </div>
              )}

              {product.targetPests && (
                <div className="text-stone-500">
                  <span className="font-semibold text-stone-700">Sasaran Efektif: </span>
                  {product.targetPests}
                </div>
              )}
            </div>
          </div>

          {/* Action area */}
          <div className="mt-6 pt-4 border-t border-stone-100">
            {/* Quantity Selector */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-stone-700">Jumlah Beli:</span>
              <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="px-3 py-1.5 text-stone-600 hover:bg-stone-100 disabled:opacity-40 transition"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(Math.min(product.stock, Math.max(1, val)));
                  }}
                  disabled={isOutOfStock}
                  className="w-12 text-center text-xs font-bold text-stone-900 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock || isOutOfStock}
                  className="px-3 py-1.5 text-stone-600 hover:bg-stone-100 disabled:opacity-40 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="w-full py-2.5 px-3 rounded-lg border border-emerald-700 text-emerald-800 hover:bg-emerald-50 font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {addedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Ditambahkan!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>+ Keranjang</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="w-full py-2.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50"
              >
                Beli Sekarang
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
