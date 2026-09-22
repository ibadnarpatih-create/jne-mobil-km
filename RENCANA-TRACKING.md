# Rencana tracking Movetra / Berry Bensin

Catatan diskusi: 12 September 2026. Fondasi pilot web diimplementasikan 14 September. APK pendamping Android uji sudah dibangun; verifikasi ulang setelah perbaikan aturan backup dilanjutkan 15 September 2026. Belum diuji pada HP asli.

## Kemajuan 14 September 2026

### APK terintegrasi 0.2.0

- Tampilan driver sekarang berada di WebView APK pada domain `https://jne.movetra.id`; satu formulir login, kamera/galeri di APK, serta penghubung mulai/henti GPS setelah penyimpanan KM berhasil. Persetujuan GPS pertama dan izin Android tetap diperlukan.
- Hasil `scripts/build-android.ps1 -Offline`: berhasil, 3 unit test Android lulus, lint 0 error/9 warning, tanda tangan v2 terverifikasi. File `artifacts/movetra-driver-0.2.0-integrated.apk` tersedia.
- Build produksi Next.js berhasil. Pemeriksaan TypeScript lulus, lint kode penghubung tanpa error (peringatan lama store tetap ada), dan 4 test protokol penghubung lulus melalui `node --test scripts/test-native-driver.mjs`.
- Penghubung web sudah dipublikasikan setelah login Vercel pengguna. Deployment `dpl_6FtdRnSz5JXa6wZv5SKkmQ6zQJ5x` READY dan alias `https://jne.movetra.id` aktif. Pemeriksaan HTTPS `/driver` menghasilkan HTTP 200; bundle produksi memuat `MovetraNative` dan status `GPS Android`. Deployment melalui CLI dari workspace; perubahan belum di-commit/push ke GitHub.
- Login nyata, kamera, GPS layar terkunci, serta siklus KM end-to-end di HP belum diuji. APK 0.2 menggunakan ID/signing key pilot yang sama; dapat diperbarui dari pilot 0.1.

### Hasil final build 15 September 2026

- `scripts/build-android.ps1 -Offline` berhasil: assembleDebug, tiga unit test (0 gagal), dan Android Lint (0 error, 9 warning: lokalisasi teks dan commit preferensi sinkron).
- APK tersedia di `artifacts/movetra-driver-0.1.0-pilot.apk`; tanda tangan APK v2 terverifikasi, checksum SHA-256 tersedia di file pendamping `.sha256`.
- Aturan Android 12+ mengecualikan sesi dan database dari cloud backup serta transfer perangkat. Build ini ditandatangani dengan kunci debug lokal dan hanya untuk uji terbatas.
- Belum ada HP terhubung: login nyata, GPS layar terkunci, offline/reconnect, refresh token, penghentian perjalanan, serta isolasi antar akun belum teruji end-to-end. Kode web belum di-push/deploy; admin memakai Tracking lokal untuk uji awal.
- Panduan instalasi, alur uji, dan batasan tersedia di `android-driver/README.md`. Situs KM: `https://jne.movetra.id/driver`; login web dan APK terpisah.

- Pengguna mengonfirmasi alamat driver `https://jne.movetra.id/driver`. Proyek APK pendamping native dibuat di `android-driver/`, dengan tombol membuka pencatatan KM di browser. Login APK terpisah; GPS pilot diaktifkan manual setelah KM awal. Integrasi otomatis awal/akhir KM di UI native belum dibuat.
- APK memiliki foreground location service, notifikasi/tombol berhenti, sesi Android Keystore, refresh token, dan antrean SQLite privat maksimum 2.880 titik/24 jam. Build awal berhasil, tiga unit test lulus, lint awal 0 error/10 warning. Aturan backup Android 12+ diperbaiki setelah pemeriksaan awal; hasil final dicatat di bawah.
- JDK 17 Microsoft terverifikasi checksum, Gradle 8.11.1, dan Android SDK 35 tersedia di `.android-tools/`. Skrip `scripts/build-android.ps1` menjalankan assembleDebug, unit test, lint, serta verifikasi tanda tangan. `adb devices` belum menemukan HP tersambung.

- Menu Tracking admin dengan tema gelap/turquoise, posisi terakhir, waktu WIB, akurasi, penanda keterlambatan, dan tautan peta. Maksimum 200 perjalanan terbaru; belum peta armada tertanam.
- Driver Supabase dengan perjalanan aktif dapat menekan **Aktifkan uji GPS**. Target pengambilan paling sering 30 detik; browser dapat memberikan lokasi lebih jarang. Tracking berhenti saat komponen perjalanan dilepas setelah selesai atau logout.
- Pilot browser memerlukan halaman terbuka/layar menyala; bukan implementasi tracking layar terkunci. Antrean hanya di memori, maksimum 120 titik, hilang saat halaman ditutup/uji dihentikan. Ini belum antrean offline APK.
- Migrasi `supabase/upgrade-tracking-phase-1.sql` sudah diterapkan pada proyek JNE `hewruqqvtjecnpvimhrw` pada 14 September 2026. Riwayat, posisi terakhir, dan RPC tersedia; RLS aktif, pembacaan anonim dan penulisan langsung ditutup. Izin RPC anonim bawaan Supabase ditemukan saat verifikasi dan dicabut secara eksplisit; file migrasi ikut diperbaiki.
- Halaman lokal `/admin?view=tracking` berhasil memuat keadaan kosong tanpa error dan tanpa galat/peringatan console. Belum ada lokasi driver; uji GPS HP dan pengujian isolasi RLS/RPC antar akun masih diperlukan.
- Pada pemeriksaan awal, Java/JDK, Gradle, adb, sdkmanager tidak tersedia. Sekarang tool lokal sudah disiapkan di `.android-tools/`; tidak perlu instalasi Android Studio global.
- Pemeriksaan TypeScript, lint, dan build Next.js berhasil pada implementasi awal. Lint memiliki tujuh peringatan kode lama. Migrasi dan izin database sudah diperiksa pada PostgreSQL Supabase; uji GPS antarperangkat belum dilakukan.

## Cara uji pilot web

Perbaikan lanjutan 14 September: pilot menjelaskan kebutuhan HTTPS pada konteks tidak aman, mencoba mengirim antrean segera ketika browser kembali online, dan menampilkan waktu kirim dalam WIB. Server lokal dapat dipakai di komputer melalui localhost; uji GPS HP memerlukan alamat HTTPS tepercaya. APK dan uji GPS HP belum selesai.

1. Migrasi sudah diterapkan pada proyek JNE yang terhubung ke aplikasi lokal; jangan menjalankan ulang skrip pembuatan tabel. Untuk proyek uji baru, terapkan migrasi satu kali.
2. Jalankan aplikasi dengan konfigurasi Supabase uji. Login driver, simpan KM awal, lalu aktifkan uji GPS dan berikan izin lokasi.
3. Login admin di perangkat/browser lain, buka Tracking, lalu pastikan nama, kendaraan, waktu, akurasi, dan tautan peta benar.
4. Putuskan jaringan driver sebentar lalu sambungkan kembali dengan halaman tetap terbuka. Periksa antrean terkirim dan titik lama tidak mengganti posisi terbaru.
5. Selesaikan perjalanan. Pastikan GPS berhenti dan admin menampilkan perjalanan selesai setelah refresh otomatis.
6. Uji penolakan izin, akun driver lain, akun nonaktif, kiriman setelah perjalanan selesai, duplikasi ID titik, dan koordinat/waktu tidak valid. Verifikasi akses admin serta isolasi riwayat driver melalui API.

Sebelum produksi: tentukan retensi dan proses penghapusan terjadwal, uji RLS/RPC pada database, siapkan APK dengan foreground location service dan antrean persisten, serta uji HP asli. Jangan menganggap pilot ini memenuhi kebutuhan tracking saat HP dikunci.

## Kebutuhan yang disepakati

- Tambahkan menu Tracking pada admin, dengan arah visual dashboard gelap dan aksen turquoise seperti referensi gambar pengguna.
- Gunakan GPS HP driver untuk lokasi live selama perjalanan.
- Tracking harus tetap berjalan saat HP dikunci.
- Perkiraan pengguna: 50–100 driver.
- Aplikasi saat ini sudah dipakai sebagai PWA yang dapat dipasang di HP.
- Distribusi Android cukup melalui APK; pengguna tidak memerlukan Play Store.

## Temuan kode lokal

- Next.js 15, React 19, TypeScript, Tailwind; branding tampilan Movetra.
- app/driver/page.tsx menangani mulai/selesai perjalanan, foto KM, riwayat, dan input BBM.
- GPS saat ini memakai getCurrentPosition sekali saat formulir dibuka, lalu menyimpan lokasi awal/akhir; belum tracking berkelanjutan.
- lib/demo-store.tsx menghubungkan akun, kendaraan, dan perjalanan ke Supabase, dengan fallback demo localStorage.
- supabase/schema.sql memiliki vehicle_logs beserta koordinat awal/akhir dan aturan akses driver/admin.
- public/sw.js menangani cache; belum ada layanan lokasi native, peta tracking, atau penyimpanan riwayat titik GPS.
- Pemeriksaan baru membaca kode lokal; belum memverifikasi database produksi atau perilaku HP.

## Arah implementasi yang dibahas, belum diputuskan detailnya

- Admin tetap memakai PWA; aplikasi Android driver memakai akun dan backend yang sama.
- Usahakan menggunakan kembali tampilan driver; pilih pendekatan integrasi web/native setelah evaluasi teknis.
- Layanan lokasi Android menangani pengambilan dan pengiriman GPS saat layar terkunci dengan izin serta notifikasi aktif. Membungkus PWA saja tidak cukup.
- Hubungkan awal tracking dengan keberhasilan simpan KM awal, dan akhir tracking dengan keberhasilan simpan KM akhir.
- Tambahkan posisi terakhir dan riwayat lokasi terpisah, akses sesuai peran, antrean lokal ketika jaringan putus, serta indikator waktu pembaruan terakhir.
- Uji pada HP asli: layar terkunci, jaringan putus/kembali, penghemat baterai, aplikasi dihentikan, dan akhir perjalanan.
- PWA yang terpasang tidak otomatis berubah menjadi APK; driver perlu satu kali instalasi Android.

## Skala dan biaya

- Tools build dapat menggunakan pilihan gratis; beberapa plugin GPS dan penyedia peta memiliki biaya tersendiri.
- Biaya operasional server/peta belum dihitung atau diverifikasi; jangan menjanjikan operasional gratis.
- Usulan awal: kirim tiap 30 detik saat bergerak, lebih jarang saat berhenti, hanya selama perjalanan aktif. Ini target desain, bukan jaminan interval aktual.
- Asumsi 8 jam aktif/hari: 50–100 driver menghasilkan 48.000–96.000 titik/hari pada interval 30 detik, atau 1,44–2,88 juta titik/30 hari.
- Retensi 30 hari hanya contoh yang dibahas, belum keputusan pengguna.

## Langkah saat dilanjutkan

1. Periksa ketersediaan Android SDK, JDK, Gradle, dan lingkungan build lokal.
2. Konfirmasi jenis HP driver, paket/kapasitas backend, kebutuhan retensi, dan pilih penyedia peta serta pendekatan native.
3. Buat versi awal tracking dan APK untuk uji beberapa HP sebelum peluncuran ke seluruh driver.
4. Uji kestabilan tracking terlebih dahulu, kemudian kembangkan visual dashboard sesuai referensi.

Referensi gambar asli: C:/Users/user/Downloads/WhatsApp Image 2026-09-12 at 20.01.59.jpeg.
