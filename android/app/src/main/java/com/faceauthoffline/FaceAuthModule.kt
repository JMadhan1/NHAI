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
            val boundingBox = WritableNativeMap()
            boundingBox.putDouble("x", box.left.toDouble())
            boundingBox.putDouble("y", box.top.toDouble())
            boundingBox.putDouble("width", ((box.right - box.left) as Float).toDouble())
            boundingBox.putDouble("height", ((box.bottom - box.top) as Float).toDouble())
            putMap("boundingBox", boundingBox)
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
        val landmarksMap = WritableNativeMap()

        if (landmarks.leftEye is List<*>) {
          landmarksMap.putArray("leftEye", listToWritableArray(landmarks.leftEye as List<Any>))
        }
        if (landmarks.rightEye is List<*>) {
          landmarksMap.putArray("rightEye", listToWritableArray(landmarks.rightEye as List<Any>))
        }
        if (landmarks.mouth is List<*>) {
          landmarksMap.putArray("mouth", listToWritableArray(landmarks.mouth as List<Any>))
        }
        if (landmarks.nose is List<*>) {
          landmarksMap.putArray("nose", listToWritableArray(landmarks.nose as List<Any>))
        }

        val headPoseMap = WritableNativeMap()
        headPoseMap.putDouble("yaw", (landmarks.headPose as? Map<String, Any>)?.get("yaw")?.toString()?.toDoubleOrNull() ?: 0.0)
        headPoseMap.putDouble("pitch", (landmarks.headPose as? Map<String, Any>)?.get("pitch")?.toString()?.toDoubleOrNull() ?: 0.0)
        headPoseMap.putDouble("roll", (landmarks.headPose as? Map<String, Any>)?.get("roll")?.toString()?.toDoubleOrNull() ?: 0.0)
        landmarksMap.putMap("headPose", headPoseMap)

        val result = WritableNativeMap().apply {
          putMap("landmarks", landmarksMap)
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

  private fun listToWritableArray(list: List<Any>): WritableArray {
    val array = WritableNativeArray()
    list.forEach { item ->
      when (item) {
        is Number -> array.pushDouble(item.toDouble())
        is String -> array.pushString(item)
        is Boolean -> array.pushBoolean(item)
        is Map<*, *> -> {
          val map = WritableNativeMap()
          (item as Map<String, Any>).forEach { (key, value) ->
            when (value) {
              is Number -> map.putDouble(key, value.toDouble())
              is String -> map.putString(key, value)
              is Boolean -> map.putBoolean(key, value)
              else -> map.putNull(key)
            }
          }
          array.pushMap(map)
        }
        else -> array.pushNull()
      }
    }
    return array
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
