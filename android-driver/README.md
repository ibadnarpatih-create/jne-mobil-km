# Movetra Driver — APK terintegrasi uji 0.2.0

## Alur versi 0.2.0

APK `artifacts/movetra-driver-0.2.0-integrated.apk` membuka tampilan driver langsung di WebView, termasuk KM, BBM, riwayat, kamera, dan galeri. Driver login satu kali di tampilan aplikasi; penghubung membuat sesi native independen untuk layanan GPS, tanpa meminta login kedua. GPS mulai sesudah simpan KM awal berhasil (izin dan persetujuan diminta pada penggunaan pertama), berhenti setelah simpan KM akhir atau logout. Jika izin/koneksi gagal, KM tetap tersimpan dan status GPS menyediakan tombol mencoba kembali.

**Penghubung web sudah dipublikasikan ke `https://jne.movetra.id`.** Deployment `dpl_6FtdRnSz5JXa6wZv5SKkmQ6zQJ5x` READY; halaman `/driver` HTTP 200 dan bundle penghubung native terverifikasi. APK menampilkan pemberitahuan jika penghubung web belum terdeteksi. APK tidak membawa salinan statis situs dan membutuhkan internet saat membuka halaman. Pembaruan APK dapat dipasang di atas pilot lama karena ID aplikasi dan signing key tetap sama. Login ulang diperlukan setelah beralih dari pilot lama.

Uji versi ini: login sekali, ambil foto KM awal melalui kamera APK, simpan, izinkan GPS/notifikasi, kunci layar, lalu periksa lokasi admin. Buka kembali APK, isi BBM/riwayat, simpan KM akhir dan pastikan notifikasi GPS berhenti. Uji juga izin ditolak, unggah gagal (GPS tidak mulai), jaringan terputus, logout, tombol kembali, restart proses, dan session refresh lebih dari satu jam. Belum diuji pada HP asli.

Bridge hanya menerima pesan dari main frame HTTPS `jne.movetra.id`, memakai AndroidX WebMessageListener. Sertifikat TLS tidak dilewati; navigasi HTTPS luar domain dibuka di aplikasi luar. Kamera memakai URI FileProvider terbatas ke cache kamera. Sesi browser dan native terpisah secara internal supaya refresh token tidak saling berebut, tetapi driver hanya mengisi satu formulir login.

Build dengan `scripts/build-android.ps1` atau `-Offline` setelah dependensi tersedia. Hasil versi 0.2.0 dan checksum disimpan di `artifacts/`. Batasan foreground service/antrean/force-stop di bawah tetap berlaku.

## Arsip pilot pendamping 0.1.0 (bukan alur versi terbaru)

Alamat pencatatan KM: https://jne.movetra.id/driver.

APK Android native (Java, Android 8/API 26 ke atas) ini menjalankan GPS dalam foreground location service. Situs pencatatan KM dibuka di browser HP agar kamera, upload foto, dan alur PWA yang sudah dipakai tetap tersedia. **Ini APK pendamping awal, belum APK dengan seluruh tampilan driver di dalamnya.** Login APK dan browser terpisah. Belum ada pengaktifan GPS otomatis ketika KM awal disimpan.

## Cara uji

1. Pasang `artifacts/movetra-driver-0.1.0-pilot.apk` pada beberapa HP uji. Ini APK debug dengan ID `id.movetra.driver.pilot`, bukan rilis armada.
2. Buka APK dan login dengan akun driver aktif (ID login, nomor HP, atau email yang sama dengan situs).
3. Tekan **Buka pencatatan KM**, login di browser bila perlu, lalu simpan KM awal.
4. Kembali ke APK. Tekan **Aktifkan GPS perjalanan**. Izinkan lokasi presisi dan notifikasi. Tunggu notifikasi GPS serta waktu kirim pertama.
5. Admin memeriksa Tracking pada versi web yang memiliki menu tersebut. Perubahan Tracking web saat ini masih lokal, sehingga admin dapat memakai http://localhost:3000/admin?view=tracking di komputer pengembang.
6. Kunci layar 15–30 menit dan pastikan waktu lokasi admin terus berubah. Ulangi dengan layar terkunci lebih dari satu jam untuk menguji refresh sesi.
7. Putuskan internet 5 menit, tetap bergerak, lalu sambungkan kembali. Antrean harus turun dan lokasi terakhir tidak mundur. Titik mempunyai UUID tetap sehingga retry tidak menggandakan riwayat.
8. Selesaikan KM di situs. Dalam kondisi online, APK memeriksa status kira-kira tiap 30 detik (ditambah latensi server), lalu menghentikan GPS. Server juga menolak kiriman setelah perjalanan ditutup.
9. Uji tombol penghentian di aplikasi/notifikasi, izin ditolak/dicabut, GPS HP dimatikan, logout, aplikasi dipaksa berhenti, restart HP, dan mode hemat baterai.

## Batasan yang harus dipahami

- Belum dibuktikan pada HP asli. Foreground service memungkinkan pekerjaan lokasi di luar layar aplikasi, tetapi interval/kelangsungan dipengaruhi Android, Doze, izin, sinyal, dan penghemat baterai produsen. Target titik paling sering 30 detik bukan jaminan interval.
- Layanan dimulai dari aplikasi yang terlihat dengan persetujuan driver. Tidak meminta `ACCESS_BACKGROUND_LOCATION`, tidak restart otomatis setelah force-stop/reboot/process kill. Buka APK lalu aktifkan kembali. Menutup browser tidak menghentikan GPS native.
- Saat offline, APK belum bisa mengetahui perjalanan sudah ditutup dari perangkat lain. Pengambilan dapat berlanjut sampai koneksi pulih atau pengguna menghentikan GPS. Batas tanpa verifikasi server: 24 jam.
- Antrean SQLite privat disimpan hingga 24 jam, maksimum 2.880 titik; titik paling lama dibuang bila penuh dengan pemberitahuan di layar. Jangan aktifkan GPS browser bersamaan.
- Backend saat ini menolak titik untuk perjalanan yang sudah selesai. Karena itu titik offline yang belum terkirim saat perjalanan ditutup akan dibuang. Selesaikan perjalanan setelah antrean terkirim bila riwayat lengkap dibutuhkan. Ini belum dukungan unggah riwayat setelah penutupan perjalanan.
- Penghentian manual mempertahankan antrean untuk perjalanan yang sama. Logout menghapus antrean. Perjalanan/akun baru tidak mengirim antrean milik yang lama.
- Sesi native dienkripsi AES-GCM dengan Android Keystore; password tidak disimpan. Backup Android dimatikan. APK hanya membawa anon/publishable key; RLS dan RPC Supabase tetap menentukan otorisasi.
- Retensi riwayat di server belum diputuskan/dijadwalkan. Jangan luncurkan ke seluruh armada sebelum uji perangkat dan akses antar akun selesai.

## Build Windows

Tool lokal: Microsoft OpenJDK 17, Gradle 8.11.1, AGP 8.9.2, Android platform/build tools 35. Tool dan cache berada di `.android-tools/` yang diabaikan Git.

```powershell
./scripts/build-android.ps1
# Setelah seluruh dependency sudah di-cache:
./scripts/build-android.ps1 -Offline
```

Skrip menyalin hanya `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari `.env.local` ke konfigurasi lokal yang diabaikan Git. Service-role/secret key ditolak. Skrip membangun APK debug, menjalankan unit test serta Android Lint, lalu memverifikasi tanda tangan dan menulis checksum.

Untuk mesin lain, buka `android-driver` di Android Studio, siapkan JDK 17 dan SDK 35, jalankan `scripts/configure-android.ps1`, lalu build modul `app`. Build release dan pengelolaan signing key produksi belum disiapkan.

## Referensi teknis

- [Foreground service type location](https://developer.android.com/develop/background-work/services/fgs/service-types#location)
- [AGP 8.9 compatibility](https://developer.android.com/build/releases/agp-8-9-0-release-notes)
- [Microsoft OpenJDK](https://learn.microsoft.com/en-us/java/openjdk/download)

## Status verifikasi

Status build, lint, unit test, dan uji perangkat dicatat pada `RENCANA-TRACKING.md` setelah proses verifikasi selesai. Test unit mencakup kompatibilitas ID login dan penolakan koordinat/waktu tidak valid; tidak menggantikan uji service, SQLite, refresh sesi, dan RLS di perangkat/database.
