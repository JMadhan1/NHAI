# FaceAuth Offline (TollGuardAI)

## Project Overview

A production-ready **React Native mobile application** for offline facial recognition and anti-spoofing liveness detection. It enables secure user enrollment and authentication entirely on-device, with an encrypted local database and optional AWS synchronization.

## Tech Stack

- **Framework:** React Native 0.73.6
- **Language:** TypeScript (app logic), Kotlin (Android native), Swift (iOS native)
- **AI/ML:** TensorFlow Lite — BlazeFace (detection) + MobileFaceNet (embeddings)
- **State:** Redux Toolkit
- **Navigation:** React Navigation (Stack)
- **Database:** SQLCipher via react-native-sqlite-storage (AES-256 encrypted)
- **Security:** react-native-keychain (hardware-backed key storage)
- **Camera:** react-native-vision-camera
- **Package Manager:** npm

## Important Notes

This is a **mobile-only app** — it cannot run as a web preview in Replit. It must be built and run on:
- An Android device/emulator (via `npm run android`)
- An iOS device/simulator (via `npm run ios`, macOS + Xcode required)

## Running Locally

```bash
# Start Metro bundler
npm start

# Run on Android (requires Android SDK + connected device/emulator)
npm run android

# Run on iOS (requires macOS + Xcode + CocoaPods)
npm run ios
```

## Project Structure

```
src/
├── components/   # Reusable UI (CameraView, LivenessChallenge, etc.)
├── native/       # TypeScript bridge to native modules (FaceAuthBridge)
├── screens/      # App screens (Auth, Enroll, Admin, History)
├── services/     # Business logic (AuthService, StorageService, SyncService)
├── store/        # Redux state (authSlice, syncSlice)
├── types/        # TypeScript interfaces
└── utils/        # Constants and helpers
android/          # Android native code (Kotlin) + TFLite model assets
ios/              # iOS native code (Swift/Obj-C)
models/           # Source TFLite model files (.tflite)
```

## User Preferences

- None recorded yet.
