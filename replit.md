# VisorAI

## Project Overview

**VisorAI** (Vision · Identity · Security) is a production-ready **React Native mobile app** for offline facial recognition and anti-spoofing liveness detection. Built for **Hackathon 7.0**.

It enables secure user enrollment and authentication entirely on-device, with an AES-256 encrypted local database and optional AWS synchronization.

## Tech Stack

- **Framework:** React Native 0.73.6
- **Language:** TypeScript (app logic), Kotlin (Android native), Swift (iOS native)
- **AI/ML:** TensorFlow Lite — BlazeFace (detection) + MobileFaceNet (embeddings)
- **State:** Redux Toolkit
- **Navigation:** React Navigation (Stack)
- **Database:** SQLCipher via react-native-sqlite-storage (AES-256 encrypted)
- **Security:** react-native-keychain (hardware-backed key storage)
- **Camera:** react-native-vision-camera v4
- **Package Manager:** npm

## App Name

**VisorAI** — registered component name matches across:
- `app.json` → `"name": "VisorAI"`
- `android/app/src/main/java/com/faceauthoffline/MainActivity.kt` → `"VisorAI"`
- `android/app/src/main/res/values/strings.xml` → `"VisorAI"`

## Important Notes

This is a **mobile-only app** — it cannot run as a web preview in Replit. It must be built and run on:
- An Android device/emulator (via `npm run android`)
- An iOS device/simulator (via `npm run ios`, macOS + Xcode required)

The JS bundle has been validated: **zero errors**, ~10MB dev bundle.

## Running Locally

```bash
# Install dependencies
npm install

# Start Metro bundler (Terminal 1)
npm start

# Run on Android — requires Android SDK + connected device/emulator (Terminal 2)
npm run android

# Run on iOS — requires macOS + Xcode + CocoaPods
cd ios && pod install && cd ..
npm run ios
```

See **SETUP.md** for the full step-by-step guide including environment setup.

## Project Structure

```
src/
├── components/     # CameraView, EnrollmentFlow, LivenessChallenge, AuthResultModal
├── native/         # FaceAuthBridge.ts (TS bridge + graceful mock fallback)
├── screens/        # HomeScreen, AuthScreen, EnrollScreen, HistoryScreen, AdminScreen, SettingsScreen
├── services/       # AuthService, StorageService, SyncService, NetworkMonitor
├── store/          # Redux slices: authSlice, syncSlice
├── types/          # TypeScript interfaces
└── utils/          # constants.ts, imageUtils.ts, cryptoUtils.ts
android/            # Kotlin native: TFLiteInferenceEngine, FaceEmbeddingEngine, LivenessDetector
ios/                # Swift/Obj-C native modules
models/             # Source TFLite model files
```

## Key Features

- 🔐 **Offline authentication** — 100% on-device, no cloud required
- 🧠 **BlazeFace + MobileFaceNet** TFLite inference (<200ms on mid-range devices)
- 👁️ **5-type liveness** — blink, smile, turn left/right, nod (anti-spoofing)
- 🔒 **AES-256 SQLCipher** encrypted local database
- ☁️ **AWS sync** — auto-sync when online, manual purge controls
- 🎨 **Premium UI** — deep space dark theme, animated boot, glassmorphism cards

## User Preferences

- None recorded yet.
