import Foundation

class LivenessDetector {
  private let BLINK_THRESHOLD: Float = 0.25
  private let SMILE_THRESHOLD: Float = 0.45
  private let HEAD_TURN_THRESHOLD: Float = 15
  private let NOD_THRESHOLD: Float = 12

  func computeEAR(_ eyeLandmarks: [[String: Any]]) -> Float {
    guard eyeLandmarks.count >= 6 else { return 1.0 }

    let points = eyeLandmarks.compactMap { p -> (Float, Float)? in
      guard let x = p["x"] as? Double, let y = p["y"] as? Double else { return nil }
      return (Float(x), Float(y))
    }

    guard points.count >= 6 else { return 1.0 }

    let dist = { (a: (Float, Float), b: (Float, Float)) -> Float in
      sqrt(pow(a.0 - b.0, 2) + pow(a.1 - b.1, 2))
    }

    let vertical1 = dist(points[1], points[5])
    let vertical2 = dist(points[2], points[4])
    let horizontal = dist(points[0], points[3])

    return (vertical1 + vertical2) / (2.0 * horizontal)
  }

  func computeMAR(_ mouthLandmarks: [[String: Any]]) -> Float {
    guard mouthLandmarks.count >= 8 else { return 0.0 }

    let points = mouthLandmarks.compactMap { p -> (Float, Float)? in
      guard let x = p["x"] as? Double, let y = p["y"] as? Double else { return nil }
      return (Float(x), Float(y))
    }

    guard points.count >= 8 else { return 0.0 }

    let dist = { (a: (Float, Float), b: (Float, Float)) -> Float in
      sqrt(pow(a.0 - b.0, 2) + pow(a.1 - b.1, 2))
    }

    let vertical = dist(points[2], points[6])
    let horizontal = dist(points[0], points[4])

    return vertical / horizontal
  }

  func isBlink(_ landmarks: FaceLandmarks) -> Bool {
    let leftEAR = computeEAR(landmarks.leftEye)
    let rightEAR = computeEAR(landmarks.rightEye)
    let avgEAR = (leftEAR + rightEAR) / 2
    return avgEAR < BLINK_THRESHOLD
  }

  func isSmile(_ landmarks: FaceLandmarks) -> Bool {
    let mar = computeMAR(landmarks.mouth)
    return mar > SMILE_THRESHOLD
  }

  func isHeadTurnLeft(_ landmarks: FaceLandmarks) -> Bool {
    let yaw = landmarks.headPose["yaw"] as? Double ?? 0
    return yaw < -Double(HEAD_TURN_THRESHOLD)
  }

  func isHeadTurnRight(_ landmarks: FaceLandmarks) -> Bool {
    let yaw = landmarks.headPose["yaw"] as? Double ?? 0
    return yaw > Double(HEAD_TURN_THRESHOLD)
  }

  func isNod(_ landmarks: FaceLandmarks) -> Bool {
    let pitch = landmarks.headPose["pitch"] as? Double ?? 0
    return abs(pitch) > Double(NOD_THRESHOLD)
  }
}
