# TFLite Models for FaceAuth Offline

This directory contains TensorFlow Lite models required for facial recognition and liveness detection.

## Required Models

You must download and place the following models in this directory:

### 1. BlazeFace (Face Detection)
- **File**: `blazeface.tflite`
- **Size**: ~190 KB
- **Purpose**: Detects faces in images
- **Source**: https://github.com/hollance/BlazeFace-PyTorch
- **Format**: TFLite quantized

### 2. MobileFaceNet (Face Embedding)
- **File**: `mobilefacenet_int8.tflite`
- **Size**: ~4 MB
- **Purpose**: Extracts 128-dimensional face embeddings
- **Source**: https://github.com/simochen/mobilefacenet-tensorflow
- **Format**: TFLite quantized (int8)

### 3. MediaPipe Face Mesh (Facial Landmarks)
- **File**: `face_mesh.tflite`
- **Size**: ~3.5 MB
- **Purpose**: Detects 468 facial landmarks for liveness detection
- **Source**: https://github.com/google/mediapipe
- **Format**: TFLite float

## Installation Steps

1. Download the three models from their respective sources
2. Place them in this directory
3. Build and deploy the app:
   ```bash
   # Android
   npm run android

   # iOS
   npm run ios
   ```

## Model Details

### Input/Output Specifications

**BlazeFace**
- Input: 128x128 RGB image (quantized uint8)
- Output: Face bounding boxes

**MobileFaceNet**
- Input: 160x160 RGB image (quantized uint8)
- Output: 128-dimensional embedding (float32)

**Face Mesh**
- Input: 192x192 RGB image (float32)
- Output: 468 landmarks (3D coordinates)

## Thresholds

- Face Detection: 0.85 confidence
- Embedding Match: 0.60 cosine similarity
- Blink Detection: EAR < 0.25
- Smile Detection: MAR > 0.45
- Head Turn: Yaw > 15°
- Nod: Pitch > 12°

## Performance

Models are optimized for mobile devices:
- Face Detection: ~50ms
- Landmark Detection: ~100ms
- Embedding Computation: ~200ms

Target devices: Android 8.0+, iOS 12.0+

## License

Each model has its own license - verify compliance before use.
