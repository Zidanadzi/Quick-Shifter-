# Panduan Build Aplikasi Antasena QS

Aplikasi ini dapat di-build menjadi dua format utama: **PWA (Progressive Web App)** dan **Native Android (Capacitor)**.

## 1. Persiapan Awal
Pastikan Anda sudah menginstal Node.js di komputer Anda. Setelah mendownload file ZIP dari AI Studio:
1. Ekstrak file ZIP.
2. Buka terminal di dalam folder tersebut.
3. Jalankan perintah:
   ```bash
   npm install
   ```

## 2. Build sebagai PWA (Web App)
Format ini paling ringan dan bisa langsung di-upload ke hosting (seperti Vercel, Netlify, atau Firebase Hosting).
1. Jalankan perintah:
   ```bash
   npm run build
   ```
2. Hasil build akan berada di folder `/dist`.
3. Upload isi folder `/dist` ke server hosting Anda.

## 3. Build sebagai Aplikasi Android (Native)
Aplikasi ini sudah dikonfigurasi menggunakan **Capacitor**.

### Opsi A: Menggunakan Android Studio (Paling Mudah)
1. Pastikan Anda sudah menginstal **Android Studio**.
2. Jalankan perintah build khusus:
   ```bash
   npm run build:android
   ```
3. Buka proyek Android di Android Studio:
   ```bash
   npx cap open android
   ```
4. Di dalam Android Studio, Anda bisa langsung menjalankan aplikasi ke HP (Run) atau membuat file APK/AAB (Build > Build Bundle(s) / APK(s)).

### Opsi B: Menggunakan Command Line (Tanpa Buka Android Studio)
Jika Anda sudah menginstal Android SDK namun tidak ingin membuka UI Android Studio yang berat:
1. Jalankan: `npm run build:android`
2. Masuk ke folder android: `cd android`
3. Jalankan perintah build Gradle:
   - Windows: `gradlew.bat assembleDebug`
   - Mac/Linux: `./gradlew assembleDebug`
4. File APK hasil build akan ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

## 4. Apakah bisa menggunakan AIDE?
Membangun proyek Capacitor di **AIDE** cukup sulit karena AIDE tidak mendukung Node.js dan npm secara bawaan. Namun, Anda bisa mencoba cara ini:
1. Lakukan `npm run build` di komputer/cloud untuk menghasilkan folder `dist`.
2. Lakukan `npx cap sync` untuk memperbarui folder `android`.
3. Pindahkan folder `android` tersebut ke HP Anda.
4. Buka folder tersebut di AIDE sebagai proyek Gradle.
*Catatan: AIDE mungkin mengalami error jika versi Gradle yang digunakan Capacitor terlalu baru.*

## 5. Rekomendasi Build Tanpa PC (Cloud Build)
Jika Anda tidak memiliki PC yang kuat, cara terbaik adalah menggunakan **GitHub Actions**. Anda cukup upload kode ini ke GitHub, dan GitHub akan membuatkan file APK secara otomatis setiap kali Anda melakukan update.

## 4. Konfigurasi Penting
- **App ID**: `com.antasena.qs` (Bisa diubah di `capacitor.config.ts`)
- **App Name**: `Antasena QS`
- **Icon & Splash**: Bisa diganti di folder `android/app/src/main/res`.

## 6. Cara Terbaik untuk Pengguna HP Saja (Tanpa Komputer)

Jika Anda hanya menggunakan HP, ada dua cara terbaik untuk "memiliki" aplikasi ini:

### Opsi A: Instal sebagai PWA (Sangat Direkomendasikan)
Ini adalah cara paling praktis dan tidak membutuhkan build apa pun.
1. Gunakan tombol **"Scan to HP"** yang ada di aplikasi.
2. Buka link tersebut di **Google Chrome** HP Anda.
3. Klik titik tiga (⋮) di pojok kanan atas Chrome.
4. Pilih **"Instal Aplikasi"** atau **"Tambahkan ke Layar Utama"**.
5. Aplikasi akan muncul di menu HP Anda dan bisa dibuka seperti aplikasi biasa, bahkan tanpa internet.

### Opsi B: Gunakan GitHub Actions (Untuk Mendapatkan File APK)
Jika Anda benar-benar butuh file **APK** tapi tidak punya komputer:
1. Ekspor proyek ini ke **GitHub** (melalui menu Settings di AI Studio).
2. Saya sudah membuatkan file otomatisasi di folder `.github/workflows/android.yml`.
3. Setiap kali Anda melakukan perubahan kode di GitHub, server GitHub akan otomatis membuatkan file APK untuk Anda.
4. Anda bisa mendownload file APK-nya langsung dari tab **"Actions"** di halaman GitHub Anda melalui browser HP.
5. File APK tersebut bisa Anda instal langsung di HP Android Anda.

## 7. Build Versi React Native (Expo/EAS)
Jika Anda ingin menggunakan versi **React Native (Expo)** yang ada di folder `/react-native-version`:
1. Masuk ke folder: `cd react-native-version`
2. Instal dependensi: `npm install`
3. Untuk build APK via Expo Dev (EAS):
   - Pastikan Anda sudah login ke Expo: `npx eas login`
   - Jalankan perintah build: `npx eas build --platform android --profile preview`
4. Anda bisa memantau proses build di dashboard **expo.dev**.

---
*Dibuat otomatis oleh AI Studio Build.*
