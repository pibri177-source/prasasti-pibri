import React from 'react';
import { Sprout, ShieldCheck, Truck, Clock, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 mt-20">
      {/* Service Highlights */}
      <div className="border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-stone-800/40 border border-stone-800">
              <div className="w-12 h-12 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Produk 100% Asli & Terdaftar</h4>
                <p className="text-xs text-stone-400 mt-0.5">Semua obat hama dan benih bersertifikasi resmi Kementan</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-stone-800/40 border border-stone-800">
              <div className="w-12 h-12 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Pengiriman Cepat Petani</h4>
                <p className="text-xs text-stone-400 mt-0.5">Antar langsung ke sawah atau kelompok tani sekitar kios</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-stone-800/40 border border-stone-800">
              <div className="w-12 h-12 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Kasir POS & Online Tersinkron</h4>
                <p className="text-xs text-stone-400 mt-0.5">Stok gudang selalu akurat dengan penyimpanan IndexedDB lokal</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white">
                <Sprout className="w-5 h-5 text-emerald-200" />
              </div>
              <span className="font-bold text-xl text-white">TaniMakmur</span>
            </div>
            <p className="text-sm text-stone-400 max-w-md leading-relaxed">
              Kios UMKM penyedia sarana produksi pertanian terlengkap. Melayani pembelian eceran dan grosir untuk kelompok tani: insektisida, fungisida, herbisida, pupuk majemuk, dan benih hibrida bermutu tinggi.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Kios No. 12, Pasar Induk Agrobisnis Karawang, Jawa Barat</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Hotline / WhatsApp Petani: 0812-3456-7890</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-semibold text-white text-sm mb-3">Kategori Produk</h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>• Insektisida & Akarisida</li>
              <li>• Fungisida & Bakterisida</li>
              <li>• Herbisida Pembasmi Gulma</li>
              <li>• Benih Padi Inpari & Hibrida</li>
              <li>• Benih Hortikultura Cabai & Tomat</li>
              <li>• Pupuk NPK & Organik Cair</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white text-sm mb-3">Metode Pembayaran</h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>• Tunai di Kasir Counter (POS)</li>
              <li>• QRIS Semua E-Wallet & Bank</li>
              <li>• Transfer Bank BRI & BCA</li>
              <li>• Verifikasi Cepat & Struk Digital</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
          <p>© {new Date().getFullYear()} TaniMakmur UMKM Pertanian. Didukung oleh IndexedDB Lokal.</p>
          <p>Dibuat untuk memajukan produktivitas pertanian Indonesia.</p>
        </div>
      </div>
    </footer>
  );
};
