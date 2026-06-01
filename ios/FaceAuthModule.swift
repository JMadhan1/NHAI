import Foundation
import React
import Vision
import CoreML
import AVFoundation

@objc(FaceAuthModule)
class FaceAuthModule: NSObject {
  private var tfliteEngine: TFLiteInferenceEngine?
  private var livenessDetector: LivenessDetector?
  private var faceEmbeddingEngine: FaceEmbeddingEngine?

  override init() {
    super.init()
    do {
      tfliteEngine = try TFLiteInferenceEngine()
      livenessDetector = LivenessDetector()
      if let engine = tfliteEngine {
        faceEmbeddingEngine = FaceEmbeddingEngine(engine)
      }
      print("FaceAuthModule initialized successfully")
    } catch {
      print("Failed to initialize FaceAuthModule: \(error.localizedDescription)")
    }
  }

  @objc
  func initialize(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    do {
      let success = try tfliteEngine?.loadModels() ?? false
      resolve(success)
    } catch {
      reject("INIT_ERROR", error.localizedDescription, error)
    }
  }

  @objc
  func detectFace(_ base64Image: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .default).async {
      do {
        guard let bitmap = self.decodeBase64ToImage(base64Image) else {
          reject("DECODE_ERROR", "Failed to decode image", nil)
          return
        }
        let detections = try self.tfliteEngine?.detectFace(bitmap) ?? []
        var result: [String: Any] = ["detected": !detections.isEmpty]
        if let detection = detections.first {
          result["boundingBox"] = [
            "x": Int(detection.origin.x),
            "y": Int(detection.origin.y),
            "width": Int(detection.size.width),
            "height": Int(detection.size.height)
          ]
        }
        resolve(result)
      } catch {
        reject("DETECT_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc
  func computeEmbedding(_ base64Image: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .default).async {
      do {
        guard let bitmap = self.decodeBase64ToImage(base64Image) else {
          reject("DECODE_ERROR", "Failed to decode image", nil)
          return
        }
        if let embedding = self.faceEmbeddingEngine?.computeEmbedding(bitmap) {
          resolve(["embedding": embedding])
        } else {
          resolve(["error": "Failed to compute embedding"])
        }
      } catch {
        reject("EMBEDDING_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc
  func computeLandmarks(_ base64Image: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .default).async {
      do {
        guard let bitmap = self.decodeBase64ToImage(base64Image) else {
          reject("DECODE_ERROR", "Failed to decode image", nil)
          return
        }
        let landmarks = try self.tfliteEngine?.computeLandmarks(bitmap)
        let result: [String: Any] = [
          "landmarks": [
            "leftEye": landmarks?.leftEye ?? [],
            "rightEye": landmarks?.rightEye ?? [],
            "mouth": landmarks?.mouth ?? [],
            "nose": ["x": landmarks?.nose.x ?? 0, "y": landmarks?.nose.y ?? 0],
            "headPose": [
              "yaw": landmarks?.headPose.yaw ?? 0,
              "pitch": landmarks?.headPose.pitch ?? 0,
              "roll": landmarks?.headPose.roll ?? 0
            ]
          ]
        ]
        resolve(result)
      } catch {
        reject("LANDMARKS_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc
  func matchEmbedding(_ embedding: [NSNumber], storedEmbeddings: [[String: Any]], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    do {
      let queryEmbedding = embedding.map { $0.floatValue }
      var bestMatch: String?
      var bestConfidence: Float = 0
      let EMBEDDING_THRESHOLD: Float = 0.6

      for storedData in storedEmbeddings {
        guard let vectorArray = storedData["vector"] as? [NSNumber],
              let userId = storedData["userId"] as? String else {
          continue
        }
        let storedVector = vectorArray.map { $0.floatValue }
        let similarity = cosineSimilarity(queryEmbedding, storedVector)
        if similarity > bestConfidence {
          bestConfidence = similarity
          bestMatch = userId
        }
      }

      var result: [String: Any] = [
        "matched": bestConfidence >= EMBEDDING_THRESHOLD,
        "confidence": Double(bestConfidence)
      ]
      if let match = bestMatch {
        result["userId"] = match
      }
      resolve(result)
    } catch {
      reject("MATCH_ERROR", error.localizedDescription, error)
    }
  }

  private func decodeBase64ToImage(_ base64String: String) -> UIImage? {
    guard let data = Data(base64Encoded: base64String) else { return nil }
    return UIImage(data: data)
  }

  private func cosineSimilarity(_ a: [Float], _ b: [Float]) -> Float {
    guard a.count == b.count else { return 0 }
    var dot: Float = 0
    var normA: Float = 0
    var normB: Float = 0
    for i in 0..<a.count {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    return dot / (sqrt(normA * normB) + Float.leastNormalMagnitude)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
