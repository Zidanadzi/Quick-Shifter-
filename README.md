# Panduan Build Aplikasi Antasena Pro (Expo Native)

Aplikasi ini sekarang menggunakan **React Native (Expo)** sebagai basis utamanya untuk performa maksimal di Android.

## 1. Persiapan Awal
Pastikan Anda sudah menginstal Node.js di komputer Anda. Setelah mendownload file ZIP dari AI Studio:
1. Ekstrak file ZIP.
2. Buka terminal di dalam folder tersebut.
3. Jalankan perintah:
   ```bash
   npm install
   ```

## 2. Menjalankan di HP (Development)
1. Instal aplikasi **Expo Go** dari Play Store di HP Anda.
2. Jalankan perintah:
   ```bash
   npx expo start
   ```
3. Scan QR Code yang muncul menggunakan aplikasi Expo Go.

## 3. Build APK via Expo Dev (EAS Build) - REKOMENDASI
Ini adalah cara termudah untuk membuat file APK tanpa perlu menginstal Android Studio yang berat.

1. **Instal EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```
2. **Login ke Akun Expo**:
   ```bash
   eas login
   ```
3. **Jalankan Build APK**:
   ```bash
   eas build --platform android --profile preview
   ```
4. Tunggu proses build selesai di server Expo (Cloud Build). Anda akan mendapatkan link download APK setelah selesai.

## 4. Menggunakan GitHub Actions
Saya telah menyertakan file otomatisasi di `.github/workflows/expo-build.yml`.
1. Ekspor proyek ini ke **GitHub** melalui menu Settings di AI Studio.
2. Setiap kali Anda melakukan *push* kode, GitHub akan menjalankan pengecekan otomatis di tab **"Actions"**.
3. Anda juga bisa menghubungkan repositori GitHub Anda langsung ke **Expo.dev** agar setiap perubahan di GitHub otomatis memicu build APK di server Expo.

## 5. Konfigurasi Penting
- **App ID**: `com.antasena.pro` (Bisa diubah di `app.json`)
- **App Name**: `Antasena Pro`
- **Icon & Splash**: Bisa dikonfigurasi melalui folder `assets` (jika ada) atau melalui `app.json`.

---
*Dibuat otomatis oleh AI Studio Build.*
