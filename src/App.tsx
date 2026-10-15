import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AdminSidebar } from './components/layout/AdminSidebar';
import { CartDrawer } from './views/marketplace/CartDrawer';
import { ToastContainer } from './components/common/Toast';

// Marketplace Views
import { MarketplaceHome } from './views/marketplace/MarketplaceHome';
import { CheckoutPage } from './views/marketplace/CheckoutPage';
import { CustomerOrders } from './views/marketplace/CustomerOrders';

// Admin Views
import { DashboardView } from './views/admin/DashboardView';
import { POSView } from './views/admin/POSView';
import { ProductsView } from './views/admin/ProductsView';
import { OrdersView } from './views/admin/OrdersView';
import { PaymentApprovalView } from './views/admin/PaymentApprovalView';
import { CustomersView } from './views/admin/CustomersView';
import { ReportsView } from './views/admin/ReportsView';

// Auth View
import { LoginView } from './views/auth/LoginView';
import { Menu, X } from 'lucide-react';

// Admin Layout with Sidebar & Mobile toggle (Protected for Admin role only)
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loginAs } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
          <Menu className="w-8 h-8 text-amber-700" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Akses Khusus Admin & Kasir POS</h2>
        <p className="text-xs text-stone-500 mt-1.5 max-w-sm">
          Anda saat ini menggunakan akun Pelanggan. Panel POS dan Manajemen Toko hanya dapat diakses oleh Admin.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link
            to="/"
            className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-white"
          >
            Kembali ke Katalog Produk
          </Link>
          <button
            onClick={() => loginAs('admin')}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800"
          >
            Masuk sebagai Admin Toko
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-stone-100">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile Sidebar Modal/Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 flex flex-col bg-stone-900">
            <div className="p-3 flex justify-end">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={() => setMobileMenuOpen(false)}>
              <AdminSidebar />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar toggle */}
        <div className="lg:hidden bg-stone-900 text-white px-4 py-3 flex items-center justify-between border-b border-stone-800">
          <div className="font-bold text-sm text-emerald-400">Admin TaniMakmur</div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1 rounded bg-stone-800 text-stone-200 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
};

// Marketplace Layout with Navbar & Footer
const MarketplaceLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Marketplace Routes */}
            <Route
              path="/"
              element={
                <MarketplaceLayout>
                  <MarketplaceHome />
                </MarketplaceLayout>
              }
            />
            <Route
              path="/checkout"
              element={
                <MarketplaceLayout>
                  <CheckoutPage />
                </MarketplaceLayout>
              }
            />
            <Route
              path="/orders"
              element={
                <MarketplaceLayout>
                  <CustomerOrders />
                </MarketplaceLayout>
              }
            />

            {/* Auth Route */}
            <Route path="/login" element={<LoginView />} />

            {/* Admin & POS Routes */}
            <Route
              path="/admin"
              element={
                <AdminLayout>
                  <DashboardView />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/pos"
              element={
                <AdminLayout>
                  <POSView />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminLayout>
                  <ProductsView />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminLayout>
                  <OrdersView />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/approvals"
              element={
                <AdminLayout>
                  <PaymentApprovalView />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/customers"
              element={
                <AdminLayout>
                  <CustomersView />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminLayout>
                  <ReportsView />
                </AdminLayout>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Global UI Elements */}
          <CartDrawer />
          <ToastContainer />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
