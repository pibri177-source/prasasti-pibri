# TaniMakmur - Marketplace & POS Pertanian UMKM

Aplikasi web terintegrasi Marketplace Online dan Point of Sale (POS) Kasir Toko untuk UMKM penyedia sarana produksi pertanian (obat-obatan/pestisida, pupuk, dan benih tanaman unggul). Menggunakan arsitektur lokal **IndexedDB** sehingga seluruh transaksi, stok gudang, data pelanggan, dan status persetujuan pembayaran tersimpan secara persisten langsung di browser tanpa ketergantungan server backend eksternal.

---

## 🌾 Fitur Utama Aplikasi

### 1. Marketplace Pertanian
- **Katalog Produk Lengkap**: Tersedia minimal 15 produk awal dalam 3 kategori utama (*Obat & Pestisida*, *Bibit & Benih*, *Pupuk & Nutrisi*).
- **Pencarian & Filter Cepat**: Cari obat hama, gulma, benih padi/sayuran berdasarkan nama, kode SKU, sasaran hama, atau kategori.
- **Sorting Fleksibel**: Urutkan berdasarkan rekomendasi, harga termurah, termahal, nama alfabetis, dan stok terbanyak.
- **Filter Ketersediaan Stok**: Opsi hanya menampilkan produk yang tersedia.
- **Detail Produk Interaktif**: Modal rincian dosis, aturan pakai tangki semprot, target hama efektif, dan status stok realtime.
- **Shopping Cart & Slide Drawer**: Atur kuantitas beli dengan validasi stok agar tidak melebihi persediaan gudang.
- **Halaman Checkout**: Form penerima petani, pilihan pengiriman (antar alamat atau ambil di kios), pilihan pembayaran (Bank BRI, Bank BCA, QRIS), serta unggah foto bukti transfer slip.

### 2. Kasir Counter Toko (POS)
- **Tampilan Kasir Cepat**: Grid produk dengan tombol sekali klik untuk menambah barang ke keranjang kasir.
- **Pelanggan Walk-in & Terdaftar**: Pilih pelanggan umum atau pilih petani terdaftar dari database.
- **Perhitungan Diskon & Kembalian**: Diskon fleksibel, kalkulator uang tunai dan kembalian instan dengan tombol nominal cepat (Uang Pas, 50rb, 100rb, 200rb, 500rb).
- **Struk Digital Thermal**: Cetak struk belanja 58mm/80mm style dengan detail toko, kasir, waktu, dan rincian transaksi.
- **Sinkronisasi Stok Otomatis**: Stok gudang langsung terpotong saat transaksi kasir diselesaikan.

### 3. Dashboard Admin
- Metrik bisnis: **Total Pendapatan (Omset)**, **Estimasi Laba Kotor**, **Jumlah Transaksi Sukses**, **Produk Terdaftar**, dan **Total Pelanggan**.
- Grafik perbandingan penjualan: **Kasir Toko (POS)** vs **Marketplace Online**.
- Peringatan stok menipis otomatis (*Low Stock Alert*) untuk produk di bawah batas minimum.
- Aktivitas transaksi dan pesanan terbaru.

### 4. Kelola Produk & Inventori Stok
- **CRUD Penuh**: Tambah produk baru, edit spesifikasi dan harga, serta hapus produk dengan konfirmasi.
- **Form Lengkap**: Kode SKU/Barcode, nama produk, kategori, harga jual, harga beli/modal, stok gudang, batas minimal stok, satuan kemasan, deskripsi, dosis/aturan pakai, sasaran hama, dan URL gambar.
- **Preset Galeri Foto Pertanian**: Pilihan cepat foto obat, benih, dan pupuk berkualitas tinggi.
- **Aksi Cepat Stok**: Tombol `+1`, `-1`, dan `+10` untuk memperbarui stok barang secara instan.

### 5. Approval Pembayaran
- Admin dapat melihat daftar pesanan online yang telah mengunggah bukti transfer.
- Preview gambar slip transfer bank atau QRIS ukuran penuh.
- **Setujui (Approve)**: Pesanan otomatis berstatus *PROCESSING* dan masuk ke catatan pendapatan.
- **Tolak (Reject)**: Kembalikan stok produk otomatis ke katalog jika bukti bayar tidak valid disertai catatan alasan penolakan.

### 6. Kelola Pesanan & Riwayat Transaksi
- Menampilkan seluruh pesanan dari POS maupun Marketplace.
- Filter berdasarkan status (*Menunggu Approval*, *Diproses*, *Dikirim*, *Selesai*, *Ditolak*).
- Aksi perubahan status pesanan (*Tandai Dikirim*, *Tandai Selesai*).
- Modal invoice lengkap dan tombol cetak bukti pesanan.

### 7. Data Pelanggan Petani
- Mengelola direktori petani, nomor WhatsApp, email, alamat, dan kelompok tani (*Poktan/Gapoktan*).
- Catatan riwayat belanja tiap pelanggan (*Customer Lifetime Value*).

### 8. Laporan Penjualan & Ekspor
- Filter periode: **Semua Waktu**, **Hari Ini**, **7 Hari Terakhir**, dan **Bulan Ini**.
- Peringkat **Produk Terlaris (Top Selling)** berdasarkan kuantitas dan omset.
- **Ekspor Data ke CSV** untuk pembukuan Excel.
- Tombol **Cetak Laporan** ringkasan bisnis.

---

## 🗄️ Arsitektur Database IndexedDB

Aplikasi menggunakan database lokal browser `TaniMakmurDB` dengan 6 *Object Stores*:
1. `products` (keyPath: `id`): Data obat, benih, dan pupuk beserta stok dan harga.
2. `categories` (keyPath: `id`): Kategori produk pertanian.
3. `customers` (keyPath: `id`): Profil pelanggan petani dan total belanja.
4. `orders` (keyPath: `id`): Seluruh pesanan marketplace dan transaksi POS.
5. `transactions` (keyPath: `id`): Buku besar pencatatan pendapatan dan laba bersih.
6. `users` (keyPath: `id`): Akun pengguna (Admin Toko & Pelanggan).

> **Sinkronisasi Otomatis**: Dilengkapi mekanisme broadcast event `tanimakmur_db_change`, sehingga saat kasir POS memotong stok atau admin mengedit produk, halaman marketplace langsung terbarui tanpa perlu reload manual.

---

## 👤 Akun & Peran Pengguna (Demo Access)

Tersedia tombol 1-klik di header dan halaman `/login` untuk berpindah peran secara instan:
- **Admin Toko**:
  - Email: `admin@tanimakmur.id`
  - Nama: Joko Santoso (Pengelola Toko)
  - Akses: Dashboard, Kasir POS, Kelola Produk, Approval Bukti Bayar, Pelanggan, Laporan.
- **Pelanggan Petani**:
  - Email: `budi@petani.id`
  - Nama: Budi Hermawan (Kelompok Tani Subur Makmur)
  - Akses: Marketplace Katalog, Keranjang, Checkout, Pesanan Saya.

*Tombol **"Reset Data Default"** tersedia di sidebar dan navbar untuk mengembalikan seluruh database ke kondisi awal 15 produk dan transaksi bawaan kapan saja.*

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

Pastikan Node.js (versi 18 ke atas) telah terpasang di komputer Anda.

### 1. Kloning atau Buka Direktori Proyek
```bash
git clone <repository-url>
cd tanimakmur
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Jalankan Server Pengembangan (Dev)
```bash
npm run dev
```

Aplikasi akan berjalan di:
```
http://localhost:3000
```

### 4. Build untuk Produksi
```bash
npm run build
```

---

## 🛠️ Tumpukan Teknologi (Tech Stack)

- **Framework**: React 19 dengan TypeScript
- **Bundler & Tooling**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM (v7)
- **Database**: Native IndexedDB API Browser
- **Ikon**: Lucide React
