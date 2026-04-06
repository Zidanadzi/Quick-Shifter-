# Panduan Build Antasena Pro (React Native Version)

File ini berisi instruksi untuk mengubah dashboard Antasena Pro Anda menjadi aplikasi Android (.apk) atau iOS (.ipa) murni menggunakan **Expo**.

## 1. Persiapan di Komputer Lokal
Jika Anda ingin mencoba menjalankan aplikasi di HP sebelum di-build:
1.  Instal **Node.js** di komputer Anda.
2.  Buka terminal/command prompt.
3.  Instal Expo CLI: `npm install -g expo-cli eas-cli`
4.  Ekstrak file ZIP dari proyek ini.
5.  Masuk ke folder `react-native-version`: `cd react-native-version`
6.  Instal dependensi: `npm install`
7.  Jalankan aplikasi: `npx expo start`
8.  Scan QR Code menggunakan aplikasi **Expo Go** di HP (Play Store/App Store).

## 2. Cara Build APK via GitHub & Expo (Tanpa Android Studio)
Langkah ini memungkinkan Anda mendapatkan file APK tanpa perlu menginstal software berat:

1.  **Buat Akun Expo**: Daftar gratis di [expo.dev](https://expo.dev).
2.  **Login di Terminal**: Jalankan `eas login` di folder proyek Anda.
3.  **Konfigurasi Proyek**: Jalankan `eas build:configure`.
4.  **Jalankan Build**:
    *   Untuk Android APK: `eas build -p android --profile preview`
    *   Untuk iOS: `eas build -p ios`
5.  **Tunggu Proses**: Server Expo akan membangun aplikasi Anda (biasanya 5-10 menit).
6.  **Download**: Setelah selesai, Anda akan diberikan link download file `.apk`.

## 3. Keunggulan Versi Native Ini
*   **Bluetooth Tanpa Browser**: Menggunakan library `react-native-ble-plx` yang bicara langsung ke hardware HP.
*   **Tanpa Bar Alamat**: Aplikasi tampil penuh (Full Screen).
*   **Ikon Kustom**: Aplikasi muncul di menu HP dengan nama "Antasena Pro".
*   **Koneksi Stabil**: Tidak akan terputus saat layar HP mati (jika dikonfigurasi lebih lanjut).

## 4. Struktur File
*   `App.tsx`: Logika utama aplikasi (UI & Bluetooth).
*   `package.json`: Daftar library yang dibutuhkan.
*   `app.json`: Konfigurasi nama aplikasi, ikon, dan izin (permissions).

---
**Selamat Mencoba!** Jika ada kendala pada logika Bluetooth di versi Native ini, Anda bisa menanyakan kembali kepada saya.
