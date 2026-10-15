import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp, formatRupiah, formatDateIndo } from '../../context/AppContext';
import { Customer, Order } from '../../types';
import { customerRepo, userRepo, generateMemberVoucherCode } from '../../services/db';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Calendar,
  Tag,
  Copy,
  Check,
  Sparkles,
  Gift,
  RefreshCw,
  ShieldCheck,
  Lock,
  KeyRound,
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { customers, orders, refreshData, showToast } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterVoucherTab, setFilterVoucherTab] = useState<'ALL' | 'HAS_VOUCHER' | 'NO_VOUCHER'>('ALL');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [farmerGroup, setFarmerGroup] = useState('');
  const [hasMemberVoucher, setHasMemberVoucher] = useState(false);
  const [memberVoucherCode, setMemberVoucherCode] = useState('');
  const [customerPassword, setCustomerPassword] = useState('petani123');

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setFarmerGroup('');
    setCustomerPassword('petani123'); // Kata sandi standar otomatis
    setHasMemberVoucher(false); // Petani baru default biasa, voucher 15% diputuskan admin
    setMemberVoucherCode(generateMemberVoucherCode('Petani'));
    setIsFormModalOpen(true);
  };

  // Automatically open create modal if navigated with ?action=new (e.g. from POS Kasir)
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openCreateModal();
      setSearchParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          updated.delete('action');
          return updated;
        },
        { replace: true }
      );
    }
  }, [searchParams]);

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setAddress(c.address);
    setFarmerGroup(c.farmerGroup || '');
    setCustomerPassword(c.password || 'petani123');
    setHasMemberVoucher(c.hasMemberVoucher !== false);
    setMemberVoucherCode(c.memberVoucherCode || generateMemberVoucherCode(c.name));
    setIsFormModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCustomer && val.trim().length > 2) {
      setMemberVoucherCode(generateMemberVoucherCode(val));
    }
  };

  const handleRegenerateCode = () => {
    const newCode = generateMemberVoucherCode(name || 'Petani');
    setMemberVoucherCode(newCode);
    showToast(`Kode voucher baru digenerate: ${newCode}`, 'info');
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      showToast('Nama dan nomor telepon wajib diisi', 'error');
      return;
    }

    try {
      const now = new Date().toISOString();
      const finalVoucherCode = memberVoucherCode.trim() || generateMemberVoucherCode(name);
      const finalPassword = customerPassword.trim() || 'petani123';

      const payload: Customer = {
        id: editingCustomer ? editingCustomer.id : 'cust-' + Date.now(),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || `${phone.replace(/\D/g, '')}@petani.id`,
        password: finalPassword,
        address: address.trim() || 'Karawang, Jawa Barat',
        farmerGroup: farmerGroup.trim() || undefined,
        isMember: true,
        memberCode: editingCustomer?.memberCode || 'MBR-' + Math.floor(100 + Math.random() * 900),
        memberTier: farmerGroup.trim() ? 'Member Kelompok Tani' : 'Member Prioritas',
        hasMemberVoucher,
        memberVoucherCode: finalVoucherCode,
        totalSpent: editingCustomer ? editingCustomer.totalSpent : 0,
        transactionCount: editingCustomer ? editingCustomer.transactionCount : 0,
        createdAt: editingCustomer ? editingCustomer.createdAt : now,
      };

      await customerRepo.save(payload);

      // Ensure User login account exists & password is in sync
      try {
        const allUsers = await userRepo.getAll();
        const existingUser = allUsers.find(
          (u) => (u.phone && u.phone === payload.phone) || (payload.email && u.email === payload.email)
        );
        if (!existingUser) {
          await userRepo.save({
            id: 'user-' + Date.now(),
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            password: finalPassword,
            address: payload.address,
            farmerGroup: payload.farmerGroup,
            role: 'customer',
          });
        } else {
          // Keep existing user password updated
          await userRepo.save({
            ...existingUser,
            name: payload.name,
            password: finalPassword,
            farmerGroup: payload.farmerGroup,
            address: payload.address,
          });
        }
      } catch (uErr) {
        console.warn('Sync user account note:', uErr);
      }

      await refreshData();
      setIsFormModalOpen(false);
      showToast(
        editingCustomer
          ? 'Data pelanggan berhasil diperbarui!'
          : 'Pelanggan / Petani baru berhasil ditambahkan!',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan data pelanggan', 'error');
    }
  };

  // Quick Toggle Voucher status from table row
  const handleToggleVoucherStatus = async (c: Customer) => {
    const nextStatus = !c.hasMemberVoucher;
    try {
      const updated = await customerRepo.toggleMemberVoucher(c.id, nextStatus);
      await refreshData();
      if (nextStatus) {
        showToast(
          `Voucher Member 15% DIBERIKAN kepada ${c.name} (Kode: ${updated?.memberVoucherCode || c.memberVoucherCode})`,
          'success'
        );
      } else {
        showToast(`Voucher Member 15% DINONAKTIFKAN untuk ${c.name}`, 'info');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal mengubah status voucher member', 'error');
    }
  };

  const handleCopyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Kode voucher "${code}" disalin ke clipboard!`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const executeDeleteCustomer = async (c: Customer) => {
    try {
      await customerRepo.delete(c.id);
      await refreshData();
      showToast(`Pelanggan "${c.name}" berhasil dihapus`, 'info');
      setDeletingCustomer(null);
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus data pelanggan', 'error');
    }
  };

  // Filter counts
  const voucherActiveCount = useMemo(() => {
    return customers.filter((c) => c.hasMemberVoucher !== false).length;
  }, [customers]);

  const noVoucherCount = useMemo(() => {
    return customers.filter((c) => c.hasMemberVoucher === false).length;
  }, [customers]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterVoucherTab === 'HAS_VOUCHER' && c.hasMemberVoucher === false) return false;
      if (filterVoucherTab === 'NO_VOUCHER' && c.hasMemberVoucher !== false) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.farmerGroup && c.farmerGroup.toLowerCase().includes(q)) ||
          (c.memberVoucherCode && c.memberVoucherCode.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [customers, filterVoucherTab, searchQuery]);

  // Dynamically compute real transaction metrics per customer based on orders
  const customerMetricsMap = useMemo(() => {
    const map = new Map<string, { count: number; spent: number }>();
    customers.forEach((c) => {
      const cPhone = (c.phone || '').replace(/\D/g, '');
      const validOrders = orders.filter((o) => {
        if (
          o.isSample ||
          o.id === 'ord-101' ||
          o.id === 'ord-102' ||
          o.id === 'ord-103' ||
          o.customerId?.startsWith('sample-')
        ) {
          return false;
        }
        if (o.customerId === c.id) return true;
        if (cPhone && o.customerPhone && o.customerPhone.replace(/\D/g, '') === cPhone) return true;
        return false;
      });

      const dynamicCount = validOrders.length;
      const dynamicSpent = validOrders.reduce((acc, ord) => acc + (ord.total || 0), 0);

      map.set(c.id, {
        count: Math.max(c.transactionCount || 0, dynamicCount),
        spent: Math.max(c.totalSpent || 0, dynamicSpent),
      });
    });
    return map;
  }, [customers, orders]);

  // Customer order history
  const customerOrders = useMemo(() => {
    if (!selectedCustomerHistory) return [];
    const histPhone = (selectedCustomerHistory.phone || '').replace(/\D/g, '');
    return orders.filter((o) => {
      if (
        o.isSample ||
        o.id === 'ord-101' ||
        o.id === 'ord-102' ||
        o.id === 'ord-103' ||
        o.customerId?.startsWith('sample-')
      ) {
        return false;
      }
      if (o.customerId === selectedCustomerHistory.id) return true;
      if (histPhone && o.customerPhone && o.customerPhone.replace(/\D/g, '') === histPhone) return true;
      return false;
    });
  }, [orders, selectedCustomerHistory]);

  return (
    <div className="flex-1 min-w-0 bg-stone-50 min-h-screen">
      <AdminHeader
        title="Data Pelanggan & Hak Voucher Member"
        subtitle="Kelola profil petani, kelompok tani, dan tentukan secara fleksibel siapa saja member yang berhak mendapatkan voucher 15%"
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 transition shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pelanggan Baru</span>
          </button>
        }
      />

      <main className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
        {/* Info Banner: Admin Voucher Assignment Authority */}
        <div className="bg-emerald-950 text-white p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-emerald-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-100 flex items-center gap-2">
                <span>Kontrol Hak Voucher Member 15% oleh Admin Toko</span>
                <span className="px-2 py-0.2 rounded bg-emerald-400 text-stone-950 text-[10px] font-extrabold uppercase">
                  Eksklusif
                </span>
              </h4>
              <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
                Setiap member memiliki kode voucher unik berbeda format <span className="font-mono text-emerald-300 font-bold">MBR-[Nama]-[KodeUnik]</span>. Kasir POS dan checkout online hanya mengizinkan diskon jika pelanggan telah diberikan status aktif oleh Admin di bawah ini.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 bg-emerald-900/60 px-3 py-2 rounded-xl border border-emerald-700/50 text-xs">
            <span className="text-emerald-300 font-bold">{voucherActiveCount}</span>
            <span className="text-stone-300">Member Berhak Diskon 15%</span>
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, nomor HP, kelompok tani, atau kode voucher (contoh: MBR-BUDI)..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-stone-50"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium border-t border-stone-100 pt-2.5">
            <button
              type="button"
              onClick={() => setFilterVoucherTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
                filterVoucherTab === 'ALL'
                  ? 'bg-stone-900 text-white font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Semua Pelanggan ({customers.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterVoucherTab('HAS_VOUCHER')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                filterVoucherTab === 'HAS_VOUCHER'
                  ? 'bg-emerald-800 text-white font-bold'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Diberi Voucher Member ({voucherActiveCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterVoucherTab('NO_VOUCHER')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                filterVoucherTab === 'NO_VOUCHER'
                  ? 'bg-stone-800 text-white font-bold'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <span>Belum Diberi Voucher ({noVoucherCount})</span>
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Nama Pelanggan</th>
                  <th className="py-3 px-4">No. HP / WhatsApp</th>
                  <th className="py-3 px-4">Kelompok Tani / Wilayah</th>
                  <th className="py-3 px-4 text-center">Hak Voucher Member 15%</th>
                  <th className="py-3 px-4 text-center">Frekuensi Belanja</th>
                  <th className="py-3 px-4 text-right">Total Belanja (LTV)</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                      <p className="font-semibold text-xs text-stone-600">
                        {customers.length === 0
                          ? 'Belum ada pelanggan terdaftar (Database Bersih)'
                          : 'Tidak ada data pelanggan yang cocok dengan pencarian / filter'}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1 max-w-sm mx-auto">
                        {customers.length === 0
                          ? 'Pelanggan dapat mendaftar sendiri melalui halaman marketplace, atau kasir/admin dapat menambahkan petani baru lewat tombol "Tambah Pelanggan" di atas.'
                          : 'Coba ubah kata kunci pencarian atau ganti filter voucher.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const isVoucherActive = c.hasMemberVoucher !== false;
                    const personalCode = c.memberVoucherCode || generateMemberVoucherCode(c.name);

                    return (
                      <tr key={c.id} className="hover:bg-stone-50/70 transition">
                        {/* Name and Member Tag */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <span>{c.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 font-mono text-[9px] font-bold">
                              {c.memberCode || 'MBR'}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-400">
                            Terdaftar: {formatDateIndo(c.createdAt)}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-stone-600 font-mono font-medium">
                          {c.phone}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-emerald-800">
                            {c.farmerGroup || 'Petani Mandiri'}
                          </div>
                          <div className="text-[11px] text-stone-400 truncate max-w-xs">{c.address}</div>
                        </td>

                        {/* Admin Member Voucher Control & Unique Personal Code */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleVoucherStatus(c)}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 shadow-2xs ${
                                isVoucherActive
                                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                                  : 'bg-stone-100 hover:bg-stone-200 text-stone-500 border border-stone-200'
                              }`}
                              title={isVoucherActive ? 'Klik untuk cabut voucher' : 'Klik untuk berikan voucher'}
                            >
                              {isVoucherActive ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  <span>Voucher Aktif</span>
                                </>
                              ) : (
                                <span>Tidak Aktif</span>
                              )}
                            </button>

                            {/* Personal Voucher Code Box */}
                            <div className="inline-flex items-center gap-1 mt-0.5 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                              <span className="font-mono text-[10px] font-bold text-emerald-800 select-all">
                                {personalCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyVoucherCode(personalCode)}
                                className="text-stone-400 hover:text-stone-700 p-0.5"
                                title="Salin Kode Voucher"
                              >
                                {copiedCode === personalCode ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center font-bold text-stone-800 font-mono">
                          {(customerMetricsMap.get(c.id)?.count ?? c.transactionCount ?? 0)} kali
                        </td>

                        <td className="py-3 px-4 text-right font-black text-emerald-800 font-mono">
                          {formatRupiah(customerMetricsMap.get(c.id)?.spent ?? c.totalSpent ?? 0)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerHistory(c)}
                              className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-[11px] transition"
                              title="Lihat Riwayat Belanja"
                            >
                              Riwayat
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              className="p-1.5 rounded-lg text-stone-600 hover:text-emerald-700 hover:bg-stone-100 transition"
                              title="Edit Profil & Voucher"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCustomer(c)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Hapus"
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

      {/* Form Add / Edit Modal with Member Voucher Rights Setting */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCustomer ? 'Edit Data Pelanggan & Hak Voucher' : 'Daftarkan Pelanggan Baru'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Nama Lengkap Petani / Pembeli *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Contoh: Pak Budi Hermawan"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">No. WhatsApp / HP *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Email (Opsional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@petani.id"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Kelompok Tani / Wilayah Desa
            </label>
            <input
              type="text"
              value={farmerGroup}
              onChange={(e) => setFarmerGroup(e.target.value)}
              placeholder="Contoh: Poktan Subur Makmur (Sawah 2 Ha)"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Alamat Lengkap</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Dusun, Desa, RT/RW..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-hidden"
            />
          </div>

          {/* KREDENSIAL MASUK AKUN PETANI */}
          <div className="p-3.5 bg-stone-100 border border-stone-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-stone-600" />
                <span>Kata Sandi Masuk Akun Petani</span>
              </label>
              <span className="text-[10px] bg-stone-200 text-stone-700 font-semibold px-2 py-0.5 rounded">
                Standar Otomatis: petani123
              </span>
            </div>
            <input
              type="text"
              value={customerPassword}
              onChange={(e) => setCustomerPassword(e.target.value)}
              placeholder="petani123"
              className="w-full px-3 py-2 border border-stone-300 bg-white rounded-lg focus:outline-hidden font-mono text-xs"
            />
            <p className="text-[10px] text-stone-500 leading-relaxed">
              Petani dapat langsung login di marketplace dengan Email / Nomor WhatsApp dan kata sandi ini. Kata sandi ini otomatis terisi dan dapat disesuaikan.
            </p>
          </div>

          {/* VOUCHER MEMBER RIGHTS CONFIGURATION */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-900 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasMemberVoucher}
                  onChange={(e) => setHasMemberVoucher(e.target.checked)}
                  className="rounded text-emerald-700 w-4 h-4"
                />
                <span>Berikan Hak Voucher Member 15%</span>
              </label>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                hasMemberVoucher ? 'bg-emerald-200 text-emerald-950' : 'bg-stone-200 text-stone-600'
              }`}>
                {hasMemberVoucher ? 'Hak Diberikan' : 'Dinonaktifkan'}
              </span>
            </div>

            <p className="text-[10px] text-stone-500 leading-relaxed">
              Jika dicentang, pelanggan dapat menggunakan kode voucher personal untuk diskon 15% saat berbelanja di kasir toko (POS) maupun katalog online.
            </p>

            {hasMemberVoucher && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-stone-700 text-[11px]">
                    Kode Voucher Personal Unik (Format: MBR-[Nama]-[KodeUnik]):
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Acak Kode Baru</span>
                  </button>
                </div>
                <input
                  type="text"
                  required={hasMemberVoucher}
                  value={memberVoucherCode}
                  onChange={(e) => setMemberVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: MBR-BUDI-892"
                  className="w-full px-3 py-2 border border-emerald-400 bg-white font-mono font-bold text-emerald-950 rounded-lg uppercase focus:outline-hidden"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl hover:bg-stone-50 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold shadow-xs"
            >
              Simpan Data Pelanggan
            </button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      {selectedCustomerHistory && (
        <Modal
          isOpen={!!selectedCustomerHistory}
          onClose={() => setSelectedCustomerHistory(null)}
          title={`Riwayat Transaksi: ${selectedCustomerHistory.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap justify-between items-center gap-2">
              <div>
                <span className="font-bold text-stone-900 block">{selectedCustomerHistory.name}</span>
                <span className="text-stone-500 font-mono">{selectedCustomerHistory.phone}</span>
              </div>
              <div className="text-right">
                <span className="text-stone-500 block text-[10px]">Total Belanja Keseluruhan</span>
                <span className="font-black text-emerald-800 text-sm font-mono">
                  {formatRupiah(selectedCustomerHistory.totalSpent)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto">
              {customerOrders.length === 0 ? (
                <p className="text-center py-6 text-stone-400">Belum ada riwayat pesanan.</p>
              ) : (
                customerOrders.map((ord) => (
                  <div key={ord.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono font-bold text-stone-900">{ord.orderNumber}</div>
                      <div className="text-[10px] text-stone-400">{formatDateIndo(ord.createdAt)}</div>
                      {ord.voucherName && (
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          Voucher: {ord.voucherName}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-800 font-mono">
                        {formatRupiah(ord.total)}
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-stone-100 text-stone-600">
                        {ord.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <Modal
          isOpen={!!deletingCustomer}
          onClose={() => setDeletingCustomer(null)}
          title="Hapus Data Pelanggan"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-stone-700 leading-relaxed">
              Yakin ingin menghapus data <strong>"{deletingCustomer.name}"</strong>? Data transaksi masa lalu akan tetap tercatat di laporan.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-50 font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDeleteCustomer(deletingCustomer)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs"
              >
                Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
