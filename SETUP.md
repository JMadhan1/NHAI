# VisorAI — Setup & Run Guide

> Vision · Identity · Security — Offline Face Auth for Hackathon 7.0

---

## ✅ Prerequisites

### 1. Node.js + npm
- Node.js **18 or 20** (LTS recommended)
- Download: https://nodejs.org

### 2. Java Development Kit (JDK)
- **JDK 17** (recommended) or JDK 21
- Download: https://www.azul.com/downloads/?package=jdk (Azul Zulu)
- OR: https://adoptium.net

### 3. Android Studio
- Download: https://developer.android.com/studio
- During install, make sure to install:
  - Android SDK
  - Android SDK Platform (API 34)
  - Android Virtual Device (AVD)

### 4. Environment Variables
Add these to your `~/.bashrc`, `~/.zshrc`, or Windows System Environment:
```bash
# macOS / Linux
export ANDROID_HOME=$HOME/Library/Android/sdk         # macOS
# export ANDROID_HOME=$HOME/Android/Sdk               # Linux
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export JAVA_HOME=/path/to/your/jdk17

# Windows (add to System Environment Variables)
# ANDROID_HOME = C:\Users\<you>\AppData\Local\Android\Sdk
# JAVA_HOME    = C:\Program Files\Java\jdk-17
```

---

## 📦 Step 1 — Install Dependencies

Clone or download the project, then:

```bash
npm install
```

---

## 📱 Step 2 — Start an Emulator OR Connect a Device

### Option A: Android Emulator
1. Open **Android Studio**
2. Click **Device Manager** (right sidebar) → **Create Device**
3. Choose **Pixel 7** (or any) → API 34 → **Finish**
4. Press ▶️ to start the emulator
5. Wait until the home screen appears

### Option B: Physical Android Phone
1. On your phone: **Settings → About Phone → tap Build Number 7 times** (enables Developer Mode)
2. **Settings → Developer Options → USB Debugging → ON**
3. Connect with USB cable
4. Run `adb devices` — your device should appear

---

## 🚀 Step 3 — Run the App

Open **two terminals**:

### Terminal 1 — Metro Bundler (JS server):
```bash
npm start
```
Wait until you see: `Welcome to Metro v0.80.x`

### Terminal 2 — Build & Install on Android:
```bash
npm run android
```

This will:
1. Compile the Kotlin native code (~2-3 min first time, ~30sec after)
2. Install the APK on your device/emulator
3. Start the app automatically

---

## 🎯 What You'll See

1. **Splash Screen** — VisorAI logo with animated boot sequence and progress bar
2. **Home Screen** — Security console with live clock, stats, Neural Engine status
3. **Enroll** — Capture face → AES-256 encrypted into SQLite
4. **Authenticate** — Live face + liveness challenge (blink / smile / turn)
5. **Admin** — Sync to AWS, purge records, manage enrolled users
6. **Settings** — Threshold tuning, AWS endpoint, clear data

---

## ⚡ Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| `ANDROID_HOME not set` | Set environment variable (see Step 0 above) |
| `SDK location not found` | Run Android Studio once, install SDK |
| `No connected devices` | Start emulator or check USB debugging |
| `Metro not found` | Run `npm install` first |
| `Gradle build failed` | Run `cd android && ./gradlew clean` then retry |
| `Camera permission denied` | Grant in phone Settings → Apps → VisorAI → Permissions |
| `White screen` | Shake device → Reload, or press `r` in Metro terminal |

---

## 🍎 iOS Build (macOS only)

```bash
# Install CocoaPods dependencies (first time only)
cd ios && pod install && cd ..

# Run on iOS Simulator
npm run ios
```

Requires: macOS + Xcode 14+ + CocoaPods (`sudo gem install cocoapods`)

---

## 🧠 AI Models

Models are already in `android/app/src/main/assets/`:
- ✅ `blazeface.tflite` — Face detection (~190 KB)
- ✅ `mobilefacenet_int8.tflite` — 128D embeddings (~4 MB)
- ⚠️ `face_mesh.tflite` — Landmark detection (optional, for full liveness)

The app works without `face_mesh.tflite` — it gracefully falls back to basic liveness detection.

---

## 🏆 Hackathon 7.0

Built with:
- React Native 0.73.6 + TypeScript
- TensorFlow Lite (BlazeFace + MobileFaceNet)
- SQLCipher AES-256 encrypted database
- react-native-vision-camera v4
- Redux Toolkit + React Navigation
- AWS sync via Axios

**100% offline-first** — no internet required for authentication.
