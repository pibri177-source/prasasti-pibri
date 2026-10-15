# Pemisahan Riwayat Transaksi per Pelanggan & Pembersihan Tampilan Akun Admin

Rencana ini menangani isolasi ketat riwayat transaksi antar akun pelanggan (misalnya pelanggan Saras dan Felina) pada halaman **Pesanan Saya**, memastikan identifikasi pelanggan menggunakan ID dan nomor akun secara presisi, serta memastikan tidak ada kredensial admin yang ditampilkan di antarmuka login.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Terkonfirmasi dari Tanya Jawab:**
> - **Lokasi Masalah**: Halaman *Pesanan Saya* saat login akun pelanggan.
> - **Metode Pemisahan**: Pisahkan riwayat transaksi secara ketat berdasarkan ID pelanggan dan nomor akun masing-masing. Riwayat pesanan perangkat lokal (*shared localStorage*) tidak lagi dicampur dengan akun pelanggan yang sudah login.
> - **Tampilan Akun Admin**: Seluruh kartu info atau banner kredensial admin toko ditiadakan dari UI login, sehingga halaman login tampak bersih dan mandiri untuk umum.

---

## 1. Overview & Core Concept

- **Apa yang Dilakukan**:
  - Memperbaiki logika filtering di halaman **Pesanan Saya** (`CustomerOrders.tsx`) dan badge notifikasi di header (`Navbar.tsx`) agar akun pelanggan yang sedang login (seperti Saras atau Felina) hanya melihat transaksi yang benar-benar milik dirinya sendiri berdasarkan `customerId`, nomor telepon, atau ID akun uniknya.
  - Menghapus ketergantungan pada array cache peramban bersama (`tanimakmur_customer_orders`) ketika seorang pelanggan telah login.
  - Memastikan sinkronisasi ID pelanggan saat pendaftaran akun baru di `LoginView.tsx`, pembuatan pesanan di `CheckoutPage.tsx`, dan pelacakan riwayat di `CustomersView.tsx`.
  - Memastikan antarmuka Login tetap bersih tanpa adanya box/kartu kredensial admin toko.

- **Target Pengguna**:
  - Pelanggan/petani yang memiliki akun sendiri dan menginginkan privasi data transaksi yang akurat serta terpisah satu sama lain.
  - Admin toko yang memerlukan pemantauan transaksi per pelanggan secara akurat.

---

## 2. User Experience & Visual Design

- **Alur Pengguna Saras vs Felina**:
  1. Pelanggan **Saras** masuk ke akun miliknya lalu melakukan pemesanan bibit/pupuk.
  2. Saat membuka halaman **Pesanan Saya**, Saras hanya melihat daftar pesanan miliknya sendiri beserta nomor resi dan statusnya.
  3. Saras keluar (*logout*), lalu pelanggan **Felina** masuk ke akun miliknya pada peramban/perangkat yang sama.
  4. Saat Felina membuka halaman **Pesanan Saya**, daftar pesanan Saras **tidak pernah** muncul; Felina hanya melihat riwayat transaksi miliknya sendiri atau tampilan kosong ramah (*empty state*) jika belum ada transaksi.
- **Tampilan Halaman Login**:
  - Halaman login minimalis dan elegan dengan dua tab: **Masuk Akun** dan **Daftar Petani Baru**.
  - Tidak ada box hitam atau kartu berisi username/password admin yang terpampang di layar.

---

## 3. Key Product Decisions & Trade-Offs

- **Isolasi Akun vs Cache Perangkat**:
  - *Keputusan*: Cache perangkat lokal (`localStorage`) hanya dijadikan fallback darurat untuk tamu anonim (pengguna yang belum login). Begitu pelanggan masuk dengan akun terdaftar (`currentUser.role === 'customer'`), sistem secara ketat **hanya** mengambil pesanan yang cocok dengan `customerId` dan nomor telepon akun tersebut.
  - *Alasan*: Menghindari kebocoran data belanja antar pelanggan yang bergantian menggunakan satu gawai atau peramban yang sama.
- **Penyelarasan ID Pengguna dan Pelanggan**:
  - *Keputusan*: Pada saat registrasi akun petani (`LoginView.tsx`), gunakan ID yang konsisten atau simpan relasi `userId` dan `customerId` sehingga relasi relasional tetap 1:1 tanpa diskrepansi.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       AUTHENTICATION                        │
│   CurrentUser: { id: "cust-xxx", phone: "0812...", ... }    │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      CheckoutPage.tsx        │ │    CustomerOrders.tsx      │
│  - Sets newOrder.customerId  │ │  - Filters strictly by:    │
│    = currentUser.id          │ │    o.customerId == user.id │
│  - Saves to user-scoped key: │ │    o.phone == user.phone   │
│    orders_{currentUser.id}   │ │  - Ignores shared device   │
└──────────────┬───────────────┘ │    orders when logged in   │
               │                 └────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────┐
│                  IndexedDB: "orders" Store                  │
│       [ { id, orderNumber, customerId, total, ... } ]       │
└─────────────────────────────────────────────────────────────┘
```

### Rencana File yang Diperbarui:
1. `src/views/marketplace/CustomerOrders.tsx`:
   - Ganti logika filter `userOrders` dan `tabCounts`: jika `currentUser` aktif, hanya filter berdasarkan `o.customerId === currentUser.id` atau kecocokan nomor telepon/ID profil pelanggan. Abaikan `storedOrderIds` perangkat bersama.
2. `src/components/layout/Navbar.tsx`:
   - Sinkronkan badge hitungan pesanan di header agar menggunakan filter ketat yang sama dengan `CustomerOrders.tsx`.
3. `src/views/marketplace/CheckoutPage.tsx`:
   - Pastikan pesanan baru mengikat `assignedCustomerId` secara konsisten ke ID akun pengguna yang sedang login.
   - Pisahkan penyimpanan cache pesanan di `localStorage` per ID pelanggan (`tanimakmur_customer_orders_${currentUser.id}`).
4. `src/views/auth/LoginView.tsx`:
   - Pastikan ID pelanggan dan ID pengguna selaras saat pendaftaran baru.
   - Pastikan tidak ada kartu informasi akun admin toko yang ditampilkan di layar login.
5. `src/views/admin/CustomersView.tsx`:
   - Hitung frekuensi transaksi dan total belanja pelanggan secara dinamis dari tabel pesanan yang sesuai dengan ID atau nomor telepon pelanggan.

---

## Verifikasi & Pengujian

1. **Uji Kasus Saras**:
   - Masuk akun dengan nomor/email Saras, buat pesanan, verifikasi bahwa hanya pesanan tersebut yang tampil di halaman Pesanan Saya.
2. **Uji Kasus Felina**:
   - Keluar dari akun Saras, masuk akun dengan nomor/email Felina.
   - Buka halaman Pesanan Saya, pastikan riwayat pesanan Saras tidak tampil di akun Felina.
   - Buat pesanan baru atas nama Felina, pastikan pesanan Felina tersimpan dan hanya muncul di akun Felina.
3. **Verifikasi Tampilan Login**:
   - Pastikan tidak ada kartu info admin di halaman login.
4. **Verifikasi Kompilasi**:
   - Jalankan `compile_applet` dan `lint_applet` untuk menjamin stabilitas aplikasi.
