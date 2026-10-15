export type ProductCategory = 'Obat & Pestisida' | 'Bibit & Benih' | 'Pupuk & Nutrisi';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: ProductCategory;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  description: string;
  usageInstructions?: string;
  targetPests?: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: ProductCategory;
  slug: string;
  description: string;
  iconName: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  farmerGroup?: string; // Kelompok Tani / Desa
  isMember?: boolean;
  memberCode?: string;
  memberTier?: string;
  hasMemberVoucher?: boolean; // Admin controls who receives the 15% member voucher
  memberVoucherCode?: string; // Unique personal voucher code: MBR-[Nama]-[KodeUnik]
  password?: string; // Optional login password for customer
  totalSpent: number;
  transactionCount: number;
  createdAt: string;
}

export type UserRole = 'admin' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string;
  address?: string;
  farmerGroup?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productCode: string;
  category: ProductCategory;
  price: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
  unit: string;
  imageUrl: string;
}

export type PaymentMethod = 'CASH' | 'QRIS' | 'BANK_TRANSFER';

export type OrderStatus =
  | 'PENDING_PAYMENT'    // Menunggu Pembeli Upload Bukti
  | 'PENDING_APPROVAL'   // Menunggu Admin Verifikasi Bukti
  | 'PROCESSING'         // Pembayaran Diterima, Sedang Dikemas
  | 'SHIPPED'            // Pesanan Dikirim
  | 'DELIVERED'          // Barang Diterima Pelanggan (Pelanggan Mengklaim Diterima)
  | 'COMPLETED'          // Pesanan Selesai (Admin Mengklaim Selesai / POS Sukses)
  | 'REJECTED'           // Pembayaran Ditolak Admin
  | 'CANCELLED';         // Dibatalkan

export type PaymentStatus = 'UNPAID' | 'WAITING_APPROVAL' | 'PAID' | 'REJECTED';

export interface Order {
  id: string;
  orderNumber: string;
  type: 'MARKETPLACE' | 'POS';
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentProofUrl?: string;
  paymentBank?: string; // e.g. 'BCA (0123-456-789)', 'BRI', 'QRIS Mandiri'
  paymentNote?: string;
  rejectionReason?: string;
  orderStatus: OrderStatus;
  cashPaid?: number;
  cashChange?: number;
  notes?: string;
  courierName?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  receivedByCustomerAt?: string;
  customerReceivedClaimed?: boolean;
  adminCompletedAt?: string;
  customerNotes?: string;
  voucherCode?: string;
  voucherName?: string;
  voucherBreakdown?: { label: string; amount: number; percent?: number }[];
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherPromo {
  id: string;
  code: string;
  name: string;
  discountPercent: number; // e.g. 15 for member, 5 for twin date
  type: 'MEMBER' | 'TWIN_DATE' | 'CUSTOM';
  minOrderAmount?: number; // e.g. 150000 for twin date
  description: string;
  badgeLabel?: string;
}

export interface PromoSettings {
  twinDatePromoEnabled: boolean; // Master toggle admin untuk promo tanggal kembar
  twinDateMinSpend: number; // Minimal belanja (default: 150000)
  twinDateDiscountPercent: number; // Persentase diskon (default: 5)
  twinDateOverrideActive: boolean; // Mode override/simulasi admin
  memberDiscountPercent: number; // Persentase diskon member (default: 15)
}

export interface TransactionRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  type: 'MARKETPLACE' | 'POS';
  customerName: string;
  total: number;
  profit: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}
