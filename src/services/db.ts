import {
  Product,
  Category,
  Customer,
  Order,
  TransactionRecord,
  User,
  OrderStatus,
  PaymentStatus,
  PromoSettings,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_ORDERS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
} from './initialData';

const DB_NAME = 'TaniMakmurDB';
const DB_VERSION = 1;

export const DB_CHANGE_EVENT = 'tanimakmur_db_change';

export function notifyDBChange(storeName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(DB_CHANGE_EVENT, { detail: { store: storeName } })
    );
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('category', 'category', { unique: false });
        productStore.createIndex('code', 'code', { unique: true });
      }

      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('orders')) {
        const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
        orderStore.createIndex('orderStatus', 'orderStatus', { unique: false });
        orderStore.createIndex('customerId', 'customerId', { unique: false });
      }

      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('email', 'email', { unique: true });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export const DB_VERSION_KEY = 'tanimakmur_db_app_version';
export const CURRENT_APP_VERSION = 'v5_reset_clean_pibri';

// Seed initial data if DB is newly created or auto-migrate to clean state
export async function initDB(): Promise<void> {
  const currentSavedVersion = typeof window !== 'undefined' ? localStorage.getItem(DB_VERSION_KEY) : null;
  if (currentSavedVersion !== CURRENT_APP_VERSION) {
    // Perform auto-reset to clean state (retaining catalog, clearing demo customers & transactions, setting admin to pibri177@gmail.com)
    try {
      await resetDatabaseToDefault();
      if (typeof window !== 'undefined') {
        localStorage.setItem(DB_VERSION_KEY, CURRENT_APP_VERSION);
        // Clear any old demo user session (e.g. Budi Hermawan)
        localStorage.removeItem('tanimakmur_current_user');
      }
      return;
    } catch (e) {
      console.error('Error during auto-reset migration', e);
    }
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['products', 'categories', 'customers', 'orders', 'transactions', 'users'], 'readonly');
    const productStore = tx.objectStore('products');
    const countRequest = productStore.count();

    countRequest.onsuccess = async () => {
      if (countRequest.result === 0) {
        // Database is empty, seed initial data
        try {
          const writeTx = db.transaction(
            ['products', 'categories', 'customers', 'orders', 'transactions', 'users'],
            'readwrite'
          );

          INITIAL_CATEGORIES.forEach((cat) => writeTx.objectStore('categories').put(cat));
          INITIAL_PRODUCTS.forEach((prod) => writeTx.objectStore('products').put(prod));
          INITIAL_CUSTOMERS.forEach((cust) => writeTx.objectStore('customers').put(cust));
          INITIAL_ORDERS.forEach((ord) => writeTx.objectStore('orders').put(ord));
          INITIAL_TRANSACTIONS.forEach((txn) => writeTx.objectStore('transactions').put(txn));
          INITIAL_USERS.forEach((usr) => writeTx.objectStore('users').put(usr));

          writeTx.oncomplete = () => {
            if (typeof window !== 'undefined') {
              localStorage.setItem(DB_VERSION_KEY, CURRENT_APP_VERSION);
            }
            notifyDBChange('all');
            resolve();
          };
          writeTx.onerror = () => reject(writeTx.error);
        } catch (err) {
          reject(err);
        }
      } else {
        resolve();
      }
    };

    countRequest.onerror = () => reject(countRequest.error);
  });
}

// Generic Store Operations
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function getByIdFromStore<T>(storeName: string, id: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve((request.result as T) || null);
    request.onerror = () => reject(request.error);
  });
}

async function putToStore<T>(storeName: string, item: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => {
      notifyDBChange(storeName);
      resolve(item);
    };
    request.onerror = () => reject(request.error);
  });
}

async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => {
      notifyDBChange(storeName);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// ================= PRODUCT REPOSITORY =================
export const productRepo = {
  getAll: () => getAllFromStore<Product>('products'),
  getById: (id: string) => getByIdFromStore<Product>('products', id),
  save: (product: Product) => putToStore<Product>('products', product),
  delete: (id: string) => deleteFromStore('products', id),

  // Batch save multiple products (for bulk auto profit 3% ratio or opname)
  batchSave: async (productsToUpdate: Product[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      productsToUpdate.forEach((p) => {
        store.put({
          ...p,
          updatedAt: new Date().toISOString(),
        });
      });
      tx.oncomplete = () => {
        notifyDBChange('products');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  // Adjust stock for single product
  adjustStock: async (productId: string, newStock: number): Promise<Product | null> => {
    const product = await getByIdFromStore<Product>('products', productId);
    if (!product) return null;
    product.stock = Math.max(0, newStock);
    product.updatedAt = new Date().toISOString();
    return putToStore<Product>('products', product);
  },

  // Deduct stock safely with validation
  deductStock: async (items: { productId: string; quantity: number }[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');

      let processed = 0;
      items.forEach((item) => {
        const getReq = store.get(item.productId);
        getReq.onsuccess = () => {
          const product = getReq.result as Product;
          if (product) {
            const newStock = Math.max(0, product.stock - item.quantity);
            store.put({
              ...product,
              stock: newStock,
              updatedAt: new Date().toISOString(),
            });
          }
          processed++;
          if (processed === items.length) {
            // will complete with tx
          }
        };
      });

      tx.oncomplete = () => {
        notifyDBChange('products');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  // Restore stock if order is cancelled or rejected
  restoreStock: async (items: { productId: string; quantity: number }[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');

      items.forEach((item) => {
        const getReq = store.get(item.productId);
        getReq.onsuccess = () => {
          const product = getReq.result as Product;
          if (product) {
            store.put({
              ...product,
              stock: product.stock + item.quantity,
              updatedAt: new Date().toISOString(),
            });
          }
        };
      });

      tx.oncomplete = () => {
        notifyDBChange('products');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },
};

// ================= CATEGORY REPOSITORY =================
export const categoryRepo = {
  getAll: () => getAllFromStore<Category>('categories'),
  save: (category: Category) => putToStore<Category>('categories', category),
};

// Helper to generate unique personal member voucher code: MBR-[Nama]-[KodeUnik]
export function generateMemberVoucherCode(name: string): string {
  const firstName = name.trim().split(' ')[0] || 'PETANI';
  const cleanName = firstName.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'MEMBER';
  const rand = Math.floor(100 + Math.random() * 900);
  return `MBR-${cleanName}-${rand}`;
}

const PROMO_SETTINGS_KEY = 'tanimakmur_promo_settings';

export const DEFAULT_PROMO_SETTINGS: PromoSettings = {
  twinDatePromoEnabled: true,
  twinDateMinSpend: 150000,
  twinDateDiscountPercent: 5,
  twinDateOverrideActive: false,
  memberDiscountPercent: 15,
};

export function getPromoSettings(): PromoSettings {
  if (typeof window === 'undefined') return DEFAULT_PROMO_SETTINGS;
  try {
    const raw = localStorage.getItem(PROMO_SETTINGS_KEY);
    if (!raw) return DEFAULT_PROMO_SETTINGS;
    return { ...DEFAULT_PROMO_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_PROMO_SETTINGS;
  }
}

export function savePromoSettings(settings: PromoSettings): PromoSettings {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROMO_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('tanimakmur_promo_settings_change', { detail: settings }));
  }
  return settings;
}

// ================= CUSTOMER REPOSITORY =================
export const customerRepo = {
  getAll: () => getAllFromStore<Customer>('customers'),
  getById: (id: string) => getByIdFromStore<Customer>('customers', id),
  save: (customer: Customer) => putToStore<Customer>('customers', customer),
  delete: (id: string) => deleteFromStore('customers', id),

  toggleMemberVoucher: async (customerId: string, hasVoucher?: boolean): Promise<Customer | null> => {
    const cust = await getByIdFromStore<Customer>('customers', customerId);
    if (!cust) return null;
    cust.hasMemberVoucher = hasVoucher !== undefined ? hasVoucher : !cust.hasMemberVoucher;
    if (cust.hasMemberVoucher && !cust.memberVoucherCode) {
      cust.memberVoucherCode = generateMemberVoucherCode(cust.name);
    }
    return putToStore<Customer>('customers', cust);
  },

  updateStats: async (customerId: string, amount: number) => {
    const cust = await getByIdFromStore<Customer>('customers', customerId);
    if (!cust) return;
    cust.totalSpent += amount;
    cust.transactionCount += 1;
    await putToStore<Customer>('customers', cust);
  },
};

// ================= ORDER & TRANSACTION REPOSITORY =================
export const orderRepo = {
  getAll: () => getAllFromStore<Order>('orders'),
  getById: (id: string) => getByIdFromStore<Order>('orders', id),
  save: async (order: Order): Promise<Order> => {
    const saved = await putToStore<Order>('orders', order);

    // If order is completed or paid immediately (e.g. POS Cash or auto-confirmed), record in transactions
    if (order.orderStatus === 'COMPLETED' || order.paymentStatus === 'PAID') {
      const profit = order.items.reduce((sum, it) => sum + (it.price - it.costPrice) * it.quantity, 0) - order.discount;
      const txRecord: TransactionRecord = {
        id: 'tx-' + order.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        customerName: order.customerName,
        total: order.total,
        profit,
        itemCount: order.items.reduce((sum, it) => sum + it.quantity, 0),
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
      };
      await putToStore<TransactionRecord>('transactions', txRecord);

      // Also update customer stats if customerId exists
      if (order.customerId && order.customerId !== 'guest') {
        await customerRepo.updateStats(order.customerId, order.total);
      }
    }

    return saved;
  },

  updateApproval: async (
    orderId: string,
    action: 'APPROVE' | 'REJECT',
    rejectionReason?: string
  ): Promise<Order> => {
    const order = await getByIdFromStore<Order>('orders', orderId);
    if (!order) throw new Error('Pesanan tidak ditemukan');

    if (action === 'APPROVE') {
      order.paymentStatus = 'PAID';
      order.orderStatus = 'PROCESSING'; // Lanjut ke status pengemasan / kirim
      order.updatedAt = new Date().toISOString();

      // Record transaction
      const rawProfit = order.items.reduce(
        (sum, it) => sum + ((it.price || 0) - (it.costPrice || 0)) * (it.quantity || 1),
        0
      ) - (order.discount || 0);

      const profit = isNaN(rawProfit) ? 0 : rawProfit;

      const txRecord: TransactionRecord = {
        id: 'tx-' + order.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        customerName: order.customerName,
        total: order.total,
        profit,
        itemCount: order.items.reduce((sum, it) => sum + (it.quantity || 1), 0),
        paymentMethod: order.paymentMethod,
        createdAt: new Date().toISOString(),
      };

      try {
        await putToStore<TransactionRecord>('transactions', txRecord);
      } catch (err) {
        console.warn('Failed recording transaction record:', err);
      }

      if (order.customerId && order.customerId !== 'guest') {
        try {
          await customerRepo.updateStats(order.customerId, order.total);
        } catch (err) {
          console.warn('Failed updating customer stats:', err);
        }
      }
    } else {
      order.paymentStatus = 'REJECTED';
      order.orderStatus = 'REJECTED';
      order.rejectionReason = rejectionReason || 'Bukti transfer tidak valid atau dana belum masuk.';
      order.updatedAt = new Date().toISOString();

      // Restore product stock because payment was rejected
      try {
        await productRepo.restoreStock(order.items);
      } catch (err) {
        console.warn('Failed restoring stock:', err);
      }
    }

    const saved = await putToStore<Order>('orders', order);
    notifyDBChange('orders');
    return saved;
  },

  updateStatus: async (
    orderId: string,
    newStatus: OrderStatus,
    shippingInfo?: {
      courierName?: string;
      trackingNumber?: string;
      notes?: string;
    }
  ): Promise<Order> => {
    const order = await getByIdFromStore<Order>('orders', orderId);
    if (!order) throw new Error('Pesanan tidak ditemukan');

    order.orderStatus = newStatus;
    order.updatedAt = new Date().toISOString();

    if (shippingInfo) {
      if (shippingInfo.courierName !== undefined) order.courierName = shippingInfo.courierName;
      if (shippingInfo.trackingNumber !== undefined) order.trackingNumber = shippingInfo.trackingNumber;
      if (shippingInfo.notes !== undefined) order.notes = shippingInfo.notes;
    }

    if (newStatus === 'SHIPPED') {
      order.shippedAt = order.shippedAt || new Date().toISOString();
    } else if (newStatus === 'DELIVERED') {
      order.deliveredAt = order.deliveredAt || new Date().toISOString();
      order.receivedByCustomerAt = order.receivedByCustomerAt || new Date().toISOString();
      order.customerReceivedClaimed = true;
    } else if (newStatus === 'COMPLETED') {
      order.deliveredAt = order.deliveredAt || new Date().toISOString();
      order.adminCompletedAt = order.adminCompletedAt || new Date().toISOString();
    } else if (newStatus === 'CANCELLED') {
      await productRepo.restoreStock(order.items);
    }

    const saved = await putToStore<Order>('orders', order);
    notifyDBChange('orders');
    return saved;
  },

  confirmDeliveryByCustomer: async (orderId: string, customerNotes?: string): Promise<Order> => {
    const order = await getByIdFromStore<Order>('orders', orderId);
    if (!order) throw new Error('Pesanan tidak ditemukan');

    // Pelanggan mengklaim bahwa dia sudah menerima pesanan
    order.orderStatus = 'DELIVERED';
    order.customerReceivedClaimed = true;
    order.deliveredAt = new Date().toISOString();
    order.receivedByCustomerAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    if (customerNotes && customerNotes.trim()) {
      order.customerNotes = customerNotes.trim();
    }

    const saved = await putToStore<Order>('orders', order);
    notifyDBChange('orders');
    return saved;
  },

  claimCompletedByAdmin: async (orderId: string, adminNotes?: string): Promise<Order> => {
    const order = await getByIdFromStore<Order>('orders', orderId);
    if (!order) throw new Error('Pesanan tidak ditemukan');

    // Admin mengklaim pesanan telah selesai setelah pelanggan menerima barang
    order.orderStatus = 'COMPLETED';
    order.adminCompletedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    if (adminNotes && adminNotes.trim()) {
      order.notes = (order.notes ? order.notes + ' | ' : '') + adminNotes.trim();
    }

    const saved = await putToStore<Order>('orders', order);
    notifyDBChange('orders');
    return saved;
  },
};

// ================= TRANSACTION REPOSITORY =================
export const transactionRepo = {
  getAll: () => getAllFromStore<TransactionRecord>('transactions'),
  save: (record: TransactionRecord) => putToStore<TransactionRecord>('transactions', record),
};

// ================= USER REPOSITORY =================
export const userRepo = {
  getAll: () => getAllFromStore<User>('users'),
  getById: (id: string) => getByIdFromStore<User>('users', id),
  getByEmail: async (email: string): Promise<User | null> => {
    const users = await getAllFromStore<User>('users');
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  getByEmailOrPhone: async (identifier: string): Promise<User | null> => {
    const users = await getAllFromStore<User>('users');
    const clean = identifier.trim();
    if (!clean) return null;
    const cleanLower = clean.toLowerCase();
    const cleanDigits = clean.replace(/\D/g, '');

    const userMatch = users.find((u) => {
      // Match email
      if (u.email && u.email.toLowerCase() === cleanLower) return true;

      // Match phone (clean non-digits)
      if (u.phone && cleanDigits.length >= 6) {
        const uDigits = u.phone.replace(/\D/g, '');
        if (
          uDigits === cleanDigits ||
          uDigits.endsWith(cleanDigits) ||
          cleanDigits.endsWith(uDigits)
        ) {
          return true;
        }
      }
      return false;
    });

    if (userMatch) return userMatch;

    // Check customers store fallback to support customers created in Data Pelanggan
    const customers = await getAllFromStore<Customer>('customers');
    const custMatch = customers.find((c) => {
      if (c.email && c.email.toLowerCase() === cleanLower) return true;
      if (c.phone && cleanDigits.length >= 6) {
        const cDigits = c.phone.replace(/\D/g, '');
        if (
          cDigits === cleanDigits ||
          cDigits.endsWith(cleanDigits) ||
          cleanDigits.endsWith(cDigits)
        ) {
          return true;
        }
      }
      return false;
    });

    if (custMatch) {
      const derivedUser: User = {
        id: custMatch.id,
        name: custMatch.name,
        email: custMatch.email,
        password: custMatch.password || 'petani123',
        role: 'customer',
        phone: custMatch.phone,
        address: custMatch.address,
        farmerGroup: custMatch.farmerGroup,
      };
      await putToStore<User>('users', derivedUser);
      return derivedUser;
    }

    return null;
  },
  save: (user: User) => putToStore<User>('users', user),
};

// ================= RESET DATABASE =================
export async function resetDatabaseToDefault(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ['products', 'categories', 'customers', 'orders', 'transactions', 'users'],
      'readwrite'
    );

    // Clear all stores
    tx.objectStore('products').clear();
    tx.objectStore('categories').clear();
    tx.objectStore('customers').clear();
    tx.objectStore('orders').clear();
    tx.objectStore('transactions').clear();
    tx.objectStore('users').clear();

    // Re-seed
    INITIAL_CATEGORIES.forEach((cat) => tx.objectStore('categories').put(cat));
    INITIAL_PRODUCTS.forEach((prod) => tx.objectStore('products').put(prod));
    INITIAL_CUSTOMERS.forEach((cust) => tx.objectStore('customers').put(cust));
    INITIAL_ORDERS.forEach((ord) => tx.objectStore('orders').put(ord));
    INITIAL_TRANSACTIONS.forEach((txn) => tx.objectStore('transactions').put(txn));
    INITIAL_USERS.forEach((usr) => tx.objectStore('users').put(usr));

    tx.oncomplete = () => {
      notifyDBChange('all');
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
