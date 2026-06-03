package com.faceauthoffline

import android.content.Context
import android.graphics.Bitmap
import android.graphics.RectF
import android.util.Log
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.gpu.CompatibilityList
import org.tensorflow.lite.nnapi.NnApiDelegate
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel

data class FaceLandmarks(
  val leftEye: List<Pair<Float, Float>>,
  val rightEye: List<Pair<Float, Float>>,
  val mouth: List<Pair<Float, Float>>,
  val nose: Pair<Float, Float>,
  val headPose: HeadPose
)

data class HeadPose(
  val yaw: Float,
  val pitch: Float,
  val roll: Float
)

class TFLiteInferenceEngine(private val context: Context) {
  private var blazefaceInterpreter: Interpreter? = null
  private var facemeshInterpreter: Interpreter? = null
  private var mobilefacenetInterpreter: Interpreter? = null
  private var nnApiDelegate: NnApiDelegate? = null

  fun loadModels(): Boolean {
    return try {
      val compatList = CompatibilityList()
      if (compatList.isDelegateSupportedOnThisDevice) {
        nnApiDelegate = NnApiDelegate()
      }

      blazefaceInterpreter = loadInterpreterFromAsset("blazeface.tflite")
      mobilefacenetInterpreter = loadInterpreterFromAsset("mobilefacenet_int8.tflite")

      try {
        facemeshInterpreter = loadInterpreterFromAsset("face_mesh.tflite")
      } catch (e: Exception) {
        Log.w(TAG, "face_mesh.tflite not found, landmarks will be unavailable: ${e.message}")
      }

      Log.d(TAG, "Models loaded successfully")
      true
    } catch (e: Exception) {
      Log.e(TAG, "Failed to load models: ${e.message}")
      false
    }
  }

  fun detectFace(bitmap: Bitmap): List<RectF> {
    return try {
      val interpreter = blazefaceInterpreter ?: return emptyList()
      val resizedBitmap = Bitmap.createScaledBitmap(bitmap, INPUT_WIDTH, INPUT_HEIGHT, true)
      val inputBuffer = bitmapToByteBuffer(resizedBitmap)

      val outputBoxes = Array(1) { FloatArray(FACE_DETECTIONS * 16) }
      val outputScores = Array(1) { FloatArray(FACE_DETECTIONS) }

      val outputs = mapOf(
        0 to outputBoxes,
        1 to outputScores
      )

      interpreter.runForMultipleInputsOutputs(arrayOf(inputBuffer), outputs)

      val detections = mutableListOf<RectF>()
      for (i in 0 until FACE_DETECTIONS) {
        val score = outputScores[0][i]
        if (score > CONFIDENCE_THRESHOLD) {
          val offset = i * 16
          val xMin = (outputBoxes[0][offset + 0] * bitmap.width).toInt()
          val yMin = (outputBoxes[0][offset + 1] * bitmap.height).toInt()
          val xMax = (outputBoxes[0][offset + 2] * bitmap.width).toInt()
          val yMax = (outputBoxes[0][offset + 3] * bitmap.height).toInt()
          detections.add(RectF(xMin.toFloat(), yMin.toFloat(), xMax.toFloat(), yMax.toFloat()))
        }
      }
      detections
    } catch (e: Exception) {
      Log.e(TAG, "Face detection error: ${e.message}")
      emptyList()
    }
  }

  fun computeLandmarks(bitmap: Bitmap): FaceLandmarks {
    return try {
      val interpreter = facemeshInterpreter ?: return FaceLandmarks(emptyList(), emptyList(), emptyList(), 0f to 0f, HeadPose(0f, 0f, 0f))
      val resizedBitmap = Bitmap.createScaledBitmap(bitmap, 192, 192, true)
      val inputBuffer = bitmapToByteBuffer(resizedBitmap)

      val outputLandmarks = Array(1) { Array(1) { FloatArray(468 * 3) } }
      interpreter.runForMultipleInputsOutputs(arrayOf(inputBuffer), mapOf(0 to outputLandmarks))

      val landmarks = outputLandmarks[0][0]
      val leftEye = mutableListOf<Pair<Float, Float>>()
      val rightEye = mutableListOf<Pair<Float, Float>>()
      val mouth = mutableListOf<Pair<Float, Float>>()
      var nose = 0f to 0f

      for (i in 0..5) {
        leftEye.add(landmarks[i * 3] * bitmap.width to landmarks[i * 3 + 1] * bitmap.height)
      }
      for (i in 6..11) {
        rightEye.add(landmarks[i * 3] * bitmap.width to landmarks[i * 3 + 1] * bitmap.height)
      }
      for (i in 12..19) {
        mouth.add(landmarks[i * 3] * bitmap.width to landmarks[i * 3 + 1] * bitmap.height)
      }
      nose = landmarks[1 * 3] * bitmap.width to landmarks[1 * 3 + 1] * bitmap.height

      val headPose = estimateHeadPose(landmarks, bitmap.width, bitmap.height)
      FaceLandmarks(leftEye, rightEye, mouth, nose, headPose)
    } catch (e: Exception) {
      Log.e(TAG, "Landmark computation error: ${e.message}")
      FaceLandmarks(emptyList(), emptyList(), emptyList(), 0f to 0f, HeadPose(0f, 0f, 0f))
    }
  }

  fun getEmbedding(bitmap: Bitmap): FloatArray? {
    return try {
      val interpreter = mobilefacenetInterpreter ?: return null
      val resizedBitmap = Bitmap.createScaledBitmap(bitmap, 160, 160, true)
      val inputBuffer = bitmapToByteBuffer(resizedBitmap)

      val output = Array(1) { FloatArray(128) }
      interpreter.runForMultipleInputsOutputs(arrayOf(inputBuffer), mapOf(0 to output))
      output[0]
    } catch (e: Exception) {
      Log.e(TAG, "Embedding error: ${e.message}")
      null
    }
  }

  private fun loadInterpreterFromAsset(modelName: String): Interpreter? {
    return try {
      val assetFileDescriptor = context.assets.openFd(modelName)
      val fileInputStream = FileInputStream(assetFileDescriptor.fileDescriptor)
      val fileChannel = fileInputStream.channel
      val startOffset = assetFileDescriptor.startOffset
      val declaredLength = assetFileDescriptor.declaredLength
      val buffer = fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)

      val options = Interpreter.Options()
      if (nnApiDelegate != null) {
        options.addDelegate(nnApiDelegate)
      }
      Interpreter(buffer, options)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to load interpreter for $modelName: ${e.message}")
      null
    }
  }

  private fun bitmapToByteBuffer(bitmap: Bitmap): ByteBuffer {
    val buffer = ByteBuffer.allocateDirect(4 * bitmap.width * bitmap.height * 3)
    buffer.order(ByteOrder.nativeOrder())
    val pixels = IntArray(bitmap.width * bitmap.height)
    bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)

    for (pixel in pixels) {
      buffer.putFloat(((pixel shr 16) and 0xFF) / 255f)
      buffer.putFloat(((pixel shr 8) and 0xFF) / 255f)
      buffer.putFloat((pixel and 0xFF) / 255f)
    }

    buffer.rewind()
    return buffer
  }

  private fun estimateHeadPose(landmarks: FloatArray, width: Int, height: Int): HeadPose {
    val nose = landmarks[1 * 3] to landmarks[1 * 3 + 1]
    val leftEye = landmarks[33 * 3] to landmarks[33 * 3 + 1]
    val rightEye = landmarks[263 * 3] to landmarks[263 * 3 + 1]

    val eyeDistance = Math.sqrt(
      Math.pow((rightEye.first - leftEye.first).toDouble(), 2.0) +
      Math.pow((rightEye.second - leftEye.second).toDouble(), 2.0)
    ).toFloat()

    val eyeCenterX = (leftEye.first + rightEye.first) / 2
    val eyeCenterY = (leftEye.second + rightEye.second) / 2

    val yaw = Math.atan2((nose.first - eyeCenterX).toDouble(), eyeDistance.toDouble()) * 180 / Math.PI
    val pitch = Math.atan2((nose.second - eyeCenterY).toDouble(), eyeDistance.toDouble()) * 180 / Math.PI

    return HeadPose(yaw.toFloat(), pitch.toFloat(), 0f)
  }

  fun release() {
    blazefaceInterpreter?.close()
    facemeshInterpreter?.close()
    mobilefacenetInterpreter?.close()
    nnApiDelegate?.close()
  }

  companion object {
    private const val TAG = "TFLiteEngine"
    private const val INPUT_WIDTH = 128
    private const val INPUT_HEIGHT = 128
    private const val FACE_DETECTIONS = 10
    private const val CONFIDENCE_THRESHOLD = 0.85f
  }
}
