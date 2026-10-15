import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  Category,
  Customer,
  Order,
  TransactionRecord,
  CartItem,
} from '../types';
import {
  initDB,
  productRepo,
  categoryRepo,
  customerRepo,
  orderRepo,
  transactionRepo,
  resetDatabaseToDefault,
  DB_CHANGE_EVENT,
} from '../services/db';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  orders: Order[];
  transactions: TransactionRecord[];
  isLoading: boolean;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => boolean;
  updateCartQuantity: (productId: string, quantity: number) => boolean;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  refreshData: () => Promise<void>;
  resetAllData: () => Promise<void>;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'tanimakmur_cart_items';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse cart', e);
        }
      }
    }
    return [];
  });

  // Save cart changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // Toast notification system
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch all data from IndexedDB
  const refreshData = useCallback(async () => {
    try {
      const [prods, cats, custs, ords, txns] = await Promise.all([
        productRepo.getAll(),
        categoryRepo.getAll(),
        customerRepo.getAll(),
        orderRepo.getAll(),
        transactionRepo.getAll(),
      ]);

      setProducts(prods);
      setCategories(cats);
      setCustomers(custs);
      // Sort orders descending by createdAt
      setOrders(ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setTransactions(txns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('Error loading data from IndexedDB', err);
      showToast('Gagal memuat data dari IndexedDB lokal', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Init DB on first mount
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDB();
        await refreshData();
      } catch (err) {
        console.error('Initialization error', err);
        setIsLoading(false);
      }
    };
    bootstrap();

    // Listen to IndexedDB change events across app
    const handleDbChange = () => {
      refreshData();
    };

    window.addEventListener(DB_CHANGE_EVENT, handleDbChange);
    return () => {
      window.removeEventListener(DB_CHANGE_EVENT, handleDbChange);
    };
  }, [refreshData]);

  // Cart operations with stock validation
  const addToCart = (product: Product, quantity = 1): boolean => {
    const existing = cart.find((item) => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    const targetQty = currentQty + quantity;

    if (targetQty > product.stock) {
      showToast(
        `Stok ${product.name} tidak mencukupi (Tersisa ${product.stock} ${product.unit})`,
        'error'
      );
      return false;
    }

    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: targetQty } : item
        )
      );
    } else {
      setCart((prev) => [...prev, { product, quantity }]);
    }

    showToast(`${product.name} ditambahkan ke keranjang`, 'success');
    return true;
  };

  const updateCartQuantity = (productId: string, quantity: number): boolean => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return true;
    }

    const item = cart.find((i) => i.product.id === productId);
    if (!item) return false;

    // Check stock from current products list
    const currentProd = products.find((p) => p.id === productId) || item.product;
    if (quantity > currentProd.stock) {
      showToast(
        `Maksimal pesanan sesuai stok yang tersedia: ${currentProd.stock} ${currentProd.unit}`,
        'error'
      );
      return false;
    }

    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
    return true;
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Produk dihapus dari keranjang', 'info');
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const resetAllData = async () => {
    setIsLoading(true);
    try {
      await resetDatabaseToDefault();
      clearCart();
      await refreshData();
      showToast('Database berhasil di-reset ke data default awal', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mereset database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        products,
        categories,
        customers,
        orders,
        transactions,
        isLoading,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartItemCount,
        toasts,
        showToast,
        dismissToast,
        refreshData,
        resetAllData,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Utilities for currency & formatting
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}
