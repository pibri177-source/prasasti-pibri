import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { userRepo, customerRepo, generateMemberVoucherCode } from '../../services/db';
import { UserRole, Customer, User as UserType } from '../../types';
import {
  Sprout,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Lock,
  Mail,
  User,
  Phone,
  Store,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Users,
  MapPin,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginAs, loginWithCredentials, setUser } = useAuth();
  const { showToast, refreshData } = useApp();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regFarmerGroup, setRegFarmerGroup] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);



  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setLoginError('Silakan masukkan Email atau Nomor WhatsApp Anda');
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await loginWithCredentials(cleanId, password);
      if (result.success && result.user) {
        showToast(`Selamat datang kembali, ${result.user.name}!`, 'success');
        if (result.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        setLoginError(result.message || 'Gagal masuk. Periksa kembali email/nomor WhatsApp dan kata sandi Anda.');
        showToast(result.message || 'Login gagal', 'error');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Terjadi kesalahan saat masuk. Silakan coba beberapa saat lagi.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const cleanName = regName.trim();
    const cleanPhone = regPhone.trim();
    const cleanPass = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    if (!cleanName) {
      setRegError('Nama Petani wajib diisi');
      return;
    }
    if (!cleanPhone) {
      setRegError('Nomor WhatsApp wajib diisi');
      return;
    }
    if (!cleanPass) {
      setRegError('Kata sandi wajib diisi');
      return;
    }
    if (cleanPass.length < 6) {
      setRegError('Kata sandi minimal 6 karakter');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setRegError('Konfirmasi kata sandi tidak cocok dengan kata sandi');
      return;
    }

    setIsRegistering(true);
    try {
      const now = new Date().toISOString();
      const uniqueTimestamp = Date.now();
      const customerId = 'cust-' + uniqueTimestamp;
      const cleanEmail = regEmail.trim() || `${cleanPhone.replace(/\D/g, '')}@petani.id`;
      const cleanAddress = regAddress.trim() || 'Karawang, Jawa Barat';
      const cleanGroup = regFarmerGroup.trim() || undefined;

      const newUser: UserType = {
        id: customerId,
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        role: 'customer' as UserRole,
        phone: cleanPhone,
        address: cleanAddress,
        farmerGroup: cleanGroup,
      };

      // Register into Customer store as regular farmer
      // Note: Member status & 15% voucher are controlled by store admin in Data Pelanggan
      const newCustomer: Customer = {
        id: customerId,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        password: cleanPass,
        address: cleanAddress,
        farmerGroup: cleanGroup,
        isMember: false,
        memberCode: 'MBR-' + Math.floor(100 + Math.random() * 900),
        memberTier: cleanGroup ? 'Petani Kelompok Tani' : 'Petani Reguler',
        hasMemberVoucher: false, // Default regular farmer; admin grants 15% voucher in Data Pelanggan
        memberVoucherCode: generateMemberVoucherCode(cleanName),
        totalSpent: 0,
        transactionCount: 0,
        createdAt: now,
      };

      await userRepo.save(newUser);
      await customerRepo.save(newCustomer);
      setUser(newUser);
      await refreshData();

      showToast(
        `Selamat datang, ${newUser.name}! Akun petani Anda berhasil didaftarkan & Anda langsung masuk ke toko.`,
        'success'
      );
      navigate('/');
    } catch (err) {
      console.error(err);
      setRegError('Gagal mendaftar akun petani. Silakan coba lagi.');
      showToast('Gagal mendaftar akun petani', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-md">
          <Sprout className="w-8 h-8 text-emerald-200" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-stone-900 tracking-tight">
          TaniMakmur Agrobisnis
        </h2>
        <p className="mt-1 text-xs text-stone-500">
          Akses Masuk Marketplace Petani & Panel Kasir POS UMKM
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-stone-200 space-y-5">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-stone-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setLoginError(null);
              }}
              className={`flex-1 py-2 rounded-lg transition text-center ${
                mode === 'LOGIN' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setRegError(null);
              }}
              className={`flex-1 py-2 rounded-lg transition text-center ${
                mode === 'REGISTER'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Daftar Petani Baru
            </button>
          </div>

          {/* Form Login */}
          {mode === 'LOGIN' ? (
            <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Email atau Nomor WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Masukkan Email atau Nomor WhatsApp"
                    className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-white"
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  Gunakan alamat email atau nomor WhatsApp yang telah terdaftar.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-stone-700">
                    Kata Sandi <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Masukkan kata sandi akun Anda"
                    className="w-full pl-9 pr-10 py-2.5 border border-stone-300 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-stone-400">
                  Pastikan kata sandi yang Anda masukkan sudah benar.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isLoggingIn ? (
                  <span>Memeriksa kredensial...</span>
                ) : (
                  <>
                    <span>Masuk ke Akun</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Form Register */
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{regError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Nama Petani / Pembeli <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      if (regError) setRegError(null);
                    }}
                    placeholder="Nama lengkap petani"
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Nomor WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => {
                        setRegPhone(e.target.value);
                        if (regError) setRegError(null);
                      }}
                      placeholder="0812-xxxx-xxxx"
                      className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Email <span className="text-stone-400 font-normal">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="petani@mail.com"
                      className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-stone-50 border border-stone-200 rounded-2xl">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">
                    Kata Sandi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        if (regError) setRegError(null);
                      }}
                      placeholder="Min. 6 karakter"
                      className="w-full pl-9 pr-9 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                      tabIndex={-1}
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-800 mb-1">
                    Konfirmasi Kata Sandi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => {
                        setRegConfirmPassword(e.target.value);
                        if (regError) setRegError(null);
                      }}
                      placeholder="Ulangi kata sandi"
                      className="w-full pl-9 pr-9 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                      tabIndex={-1}
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2 text-[10px] text-stone-500">
                  Kata sandi ini akan digunakan petani saat masuk akun via Email atau nomor WhatsApp.
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Kelompok Tani <span className="text-stone-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={regFarmerGroup}
                    onChange={(e) => setRegFarmerGroup(e.target.value)}
                    placeholder="Contoh: Poktan Subur Makmur Karawang"
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Alamat Domisili <span className="text-stone-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Desa / Dusun / Kecamatan..."
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl focus:outline-hidden focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1 text-emerald-950">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Sinkronisasi Otomatis Toko & Kasir</span>
                </div>
                <p className="text-[10px] text-emerald-700">
                  Petani baru akan langsung terdaftar di database toko. Hak voucher member diskon 15% dapat diaktifkan oleh admin toko melalui menu Data Pelanggan.
                </p>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
              >
                {isRegistering ? (
                  <span>Mendaftarkan akun...</span>
                ) : (
                  <>
                    <span>Daftar Akun Petani & Masuk</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-stone-400">
          TaniMakmur POS & Marketplace &bull; Karawang, Jawa Barat
        </div>
      </div>
    </div>
  );
};
