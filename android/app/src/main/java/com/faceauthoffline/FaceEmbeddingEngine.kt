package com.faceauthoffline

import android.graphics.Bitmap
import android.util.Log

class FaceEmbeddingEngine(private val tfliteEngine: TFLiteInferenceEngine) {
  fun computeEmbedding(bitmap: Bitmap): FloatArray? {
    return try {
      val embedding = tfliteEngine.getEmbedding(bitmap)
      if (embedding != null) {
        normalizeEmbedding(embedding)
      } else {
        null
      }
    } catch (e: Exception) {
      Log.e(TAG, "Failed to compute embedding: ${e.message}")
      null
    }
  }

  fun cosineSimilarity(a: FloatArray, b: FloatArray): Float {
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

  private fun normalizeEmbedding(embedding: FloatArray): FloatArray {
    var norm = 0f
    for (value in embedding) {
      norm += value * value
    }
    norm = Math.sqrt(norm.toDouble()).toFloat()
    if (norm > 0) {
      for (i in embedding.indices) {
        embedding[i] /= norm
      }
    }
    return embedding
  }

  companion object {
    private const val TAG = "FaceEmbeddingEngine"
  }
}
