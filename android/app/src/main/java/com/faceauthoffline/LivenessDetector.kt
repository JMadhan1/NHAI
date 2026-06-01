package com.faceauthoffline

import android.util.Log
import kotlin.math.abs
import kotlin.math.sqrt

class LivenessDetector {
  fun computeEAR(eyeLandmarks: List<Pair<Float, Float>>): Float {
    if (eyeLandmarks.size < 6) return 1.0f
    val dist = { a: Pair<Float, Float>, b: Pair<Float, Float> ->
      sqrt((a.first - b.first) * (a.first - b.first) + (a.second - b.second) * (a.second - b.second))
    }
    val vertical1 = dist(eyeLandmarks[1], eyeLandmarks[5])
    val vertical2 = dist(eyeLandmarks[2], eyeLandmarks[4])
    val horizontal = dist(eyeLandmarks[0], eyeLandmarks[3])
    return (vertical1 + vertical2) / (2.0f * horizontal)
  }

  fun computeMAR(mouthLandmarks: List<Pair<Float, Float>>): Float {
    if (mouthLandmarks.size < 8) return 0.0f
    val dist = { a: Pair<Float, Float>, b: Pair<Float, Float> ->
      sqrt((a.first - b.first) * (a.first - b.first) + (a.second - b.second) * (a.second - b.second))
    }
    val vertical = dist(mouthLandmarks[2], mouthLandmarks[6])
    val horizontal = dist(mouthLandmarks[0], mouthLandmarks[4])
    return vertical / horizontal
  }

  fun isBlink(landmarks: FaceLandmarks): Boolean {
    val leftEAR = computeEAR(landmarks.leftEye)
    val rightEAR = computeEAR(landmarks.rightEye)
    val avgEAR = (leftEAR + rightEAR) / 2
    return avgEAR < BLINK_THRESHOLD
  }

  fun isSmile(landmarks: FaceLandmarks): Boolean {
    val mar = computeMAR(landmarks.mouth)
    return mar > SMILE_THRESHOLD
  }

  fun isHeadTurnLeft(landmarks: FaceLandmarks): Boolean {
    return landmarks.headPose.yaw < -HEAD_TURN_THRESHOLD
  }

  fun isHeadTurnRight(landmarks: FaceLandmarks): Boolean {
    return landmarks.headPose.yaw > HEAD_TURN_THRESHOLD
  }

  fun isNod(landmarks: FaceLandmarks): Boolean {
    return abs(landmarks.headPose.pitch) > NOD_THRESHOLD
  }

  companion object {
    private const val BLINK_THRESHOLD = 0.25f
    private const val SMILE_THRESHOLD = 0.45f
    private const val HEAD_TURN_THRESHOLD = 15f
    private const val NOD_THRESHOLD = 12f
  }
}
