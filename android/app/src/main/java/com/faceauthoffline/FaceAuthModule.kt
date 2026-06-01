package com.faceauthoffline

import android.graphics.Bitmap
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import kotlinx.coroutines.*

class FaceAuthModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private lateinit var tfliteEngine: TFLiteInferenceEngine
  private lateinit var livenessDetector: LivenessDetector
  private lateinit var faceEmbeddingEngine: FaceEmbeddingEngine
  private val scope = CoroutineScope(Dispatchers.Default + Job())

  init {
    try {
      tfliteEngine = TFLiteInferenceEngine(reactContext)
      livenessDetector = LivenessDetector()
      faceEmbeddingEngine = FaceEmbeddingEngine(tfliteEngine)
      Log.d(TAG, "FaceAuthModule initialized successfully")
    } catch (e: Exception) {
      Log.e(TAG, "Failed to initialize FaceAuthModule: ${e.message}")
    }
  }

  override fun getName(): String = "FaceAuthModule"

  @ReactMethod
  fun initialize(promise: Promise) {
    try {
      val success = tfliteEngine.loadModels()
      promise.resolve(success)
    } catch (e: Exception) {
      promise.reject("INIT_ERROR", e.message)
    }
  }

  @ReactMethod
  fun detectFace(base64Image: String, promise: Promise) {
    scope.launch {
      try {
        val bitmap = decodeBase64ToBitmap(base64Image)
        val detected = tfliteEngine.detectFace(bitmap)
        val result = WritableNativeMap().apply {
          putBoolean("detected", detected.isNotEmpty())
          if (detected.isNotEmpty()) {
            val box = detected[0]
            putMap("boundingBox", WritableNativeMap().apply {
              putInt("x", box.left)
              putInt("y", box.top)
              putInt("width", box.right - box.left)
              putInt("height", box.bottom - box.top)
            })
          }
        }
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("DETECT_ERROR", e.message)
      }
    }
  }

  @ReactMethod
  fun computeEmbedding(base64Image: String, promise: Promise) {
    scope.launch {
      try {
        val bitmap = decodeBase64ToBitmap(base64Image)
        val embedding = faceEmbeddingEngine.computeEmbedding(bitmap)
        val result = WritableNativeMap().apply {
          if (embedding != null) {
            val array = WritableNativeArray()
            embedding.forEach { array.pushDouble(it.toDouble()) }
            putArray("embedding", array)
          } else {
            putString("error", "Failed to compute embedding")
          }
        }
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("EMBEDDING_ERROR", e.message)
      }
    }
  }

  @ReactMethod
  fun computeLandmarks(base64Image: String, promise: Promise) {
    scope.launch {
      try {
        val bitmap = decodeBase64ToBitmap(base64Image)
        val landmarks = tfliteEngine.computeLandmarks(bitmap)
        val result = WritableNativeMap().apply {
          putMap("landmarks", WritableNativeMap().apply {
            putArray("leftEye", arrayToWritable(landmarks.leftEye))
            putArray("rightEye", arrayToWritable(landmarks.rightEye))
            putArray("mouth", arrayToWritable(landmarks.mouth))
            putMap("nose", mapToWritable(landmarks.nose))
            putMap("headPose", WritableNativeMap().apply {
              putDouble("yaw", landmarks.headPose.yaw)
              putDouble("pitch", landmarks.headPose.pitch)
              putDouble("roll", landmarks.headPose.roll)
            })
          })
        }
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("LANDMARKS_ERROR", e.message)
      }
    }
  }

  @ReactMethod
  fun matchEmbedding(
    embedding: ReadableArray,
    storedEmbeddings: ReadableArray,
    promise: Promise
  ) {
    try {
      val queryEmbedding = readableArrayToFloatArray(embedding)
      var bestMatch: String? = null
      var bestConfidence = 0f

      for (i in 0 until storedEmbeddings.size()) {
        val stored = storedEmbeddings.getMap(i)
        val storedVector = readableArrayToFloatArray(stored.getArray("vector")!!)
        val similarity = cosineSimilarity(queryEmbedding, storedVector)
        if (similarity > bestConfidence) {
          bestConfidence = similarity
          bestMatch = stored.getString("userId")
        }
      }

      val result = WritableNativeMap().apply {
        putBoolean("matched", bestConfidence >= EMBEDDING_THRESHOLD)
        if (bestMatch != null) {
          putString("userId", bestMatch)
        }
        putDouble("confidence", bestConfidence.toDouble())
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("MATCH_ERROR", e.message)
    }
  }

  private fun decodeBase64ToBitmap(base64: String): Bitmap {
    val decodedBytes = Base64.decode(base64, Base64.DEFAULT)
    return android.graphics.BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
  }

  private fun readableArrayToFloatArray(array: ReadableArray): FloatArray {
    val result = FloatArray(array.size())
    for (i in 0 until array.size()) {
      result[i] = array.getDouble(i).toFloat()
    }
    return result
  }

  private fun arrayToWritable(points: List<Pair<Float, Float>>): WritableArray {
    val array = WritableNativeArray()
    points.forEach {
      array.pushMap(mapToWritable(mapOf("x" to it.first, "y" to it.second)))
    }
    return array
  }

  private fun mapToWritable(map: Map<String, Any>): WritableMap {
    return WritableNativeMap().apply {
      map.forEach { (key, value) ->
        when (value) {
          is String -> putString(key, value)
          is Number -> putDouble(key, value.toDouble())
          is Boolean -> putBoolean(key, value)
        }
      }
    }
  }

  private fun cosineSimilarity(a: FloatArray, b: FloatArray): Float {
    if (a.size != b.size) return 0f
    var dot = 0f
    var normA = 0f
    var normB = 0f
    for (i in a.indices) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    return dot / (Math.sqrt((normA * normB).toDouble())).toFloat()
  }

  override fun onCatalystInstanceDestroy() {
    super.onCatalystInstanceDestroy()
    scope.cancel()
  }

  companion object {
    private const val TAG = "FaceAuthModule"
    private const val EMBEDDING_THRESHOLD = 0.6f
  }
}
