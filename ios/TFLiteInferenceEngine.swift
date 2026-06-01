import Foundation
import CoreML
import Vision

struct FaceLandmarks {
  let leftEye: [[String: Any]]
  let rightEye: [[String: Any]]
  let mouth: [[String: Any]]
  let nose: [String: Any]
  let headPose: [String: Any]
}

class TFLiteInferenceEngine {
  private var blazefaceModel: MLModel?
  private var facemeshModel: MLModel?
  private var mobilefacenetModel: MLModel?

  init() throws {
    try loadModels()
  }

  func loadModels() throws -> Bool {
    do {
      if let blazefacePath = Bundle.main.path(forResource: "blazeface", ofType: "mlmodel") {
        let blazefaceURL = URL(fileURLWithPath: blazefacePath)
        blazefaceModel = try MLModel(contentsOf: blazefaceURL)
      }
      if let facemeshPath = Bundle.main.path(forResource: "face_mesh", ofType: "mlmodel") {
        let facemeshURL = URL(fileURLWithPath: facemeshPath)
        facemeshModel = try MLModel(contentsOf: facemeshURL)
      }
      if let mobilefacenetPath = Bundle.main.path(forResource: "mobilefacenet_int8", ofType: "mlmodel") {
        let mobilefacenetURL = URL(fileURLWithPath: mobilefacenetPath)
        mobilefacenetModel = try MLModel(contentsOf: mobilefacenetURL)
      }
      print("Models loaded successfully")
      return true
    } catch {
      print("Failed to load models: \(error.localizedDescription)")
      throw error
    }
  }

  func detectFace(_ image: UIImage) throws -> [CGRect] {
    let request = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(cgImage: image.cgImage!, options: [:])
    try handler.perform([request])

    var detections: [CGRect] = []
    if let results = request.results as? [VNFaceObservation] {
      for observation in results {
        let rect = VNImageRectForNormalizedRect(observation.boundingBox, Int(image.size.width), Int(image.size.height))
        detections.append(rect)
      }
    }
    return detections
  }

  func computeLandmarks(_ image: UIImage) throws -> FaceLandmarks? {
    let request = VNDetectFaceLandmarksRequest()
    let handler = VNImageRequestHandler(cgImage: image.cgImage!, options: [:])
    try handler.perform([request])

    if let results = request.results as? [VNFaceObservation], let observation = results.first {
      let landmarks = observation.landmarks!
      let scale = CGFloat(image.size.width)

      let leftEye = landmarks.leftEye?.pointsInImage(imageSize: image.size).map { p in
        ["x": Double(p.x), "y": Double(p.y)]
      } ?? []

      let rightEye = landmarks.rightEye?.pointsInImage(imageSize: image.size).map { p in
        ["x": Double(p.x), "y": Double(p.y)]
      } ?? []

      let mouth = landmarks.mouth?.pointsInImage(imageSize: image.size).map { p in
        ["x": Double(p.x), "y": Double(p.y)]
      } ?? []

      let noseTip = landmarks.noseCrest?.pointsInImage(imageSize: image.size).first
      let nose = ["x": Double(noseTip?.x ?? 0), "y": Double(noseTip?.y ?? 0)]

      let headPose = estimateHeadPose(observation, imageSize: image.size)

      return FaceLandmarks(
        leftEye: leftEye,
        rightEye: rightEye,
        mouth: mouth,
        nose: nose,
        headPose: headPose
      )
    }
    return nil
  }

  func getEmbedding(_ image: UIImage) throws -> [Float]? {
    let resized = resizeImage(image, to: CGSize(width: 160, height: 160))
    let pixelBuffer = try createPixelBuffer(from: resized)

    guard let model = mobilefacenetModel else { return nil }
    let input = try MLFeatureValue(pixelBuffer: pixelBuffer)
    let prediction = try model.prediction(from: MLFeatureProvider(dictionary: ["input": input]))

    if let output = prediction.featureValue(for: "output")?.multiArrayValue {
      var embedding: [Float] = []
      for i in 0..<output.count {
        embedding.append(output[i].floatValue)
      }
      return normalizeEmbedding(embedding)
    }
    return nil
  }

  private func estimateHeadPose(_ observation: VNFaceObservation, imageSize: CGSize) -> [String: Any] {
    let yaw = observation.yaw?.doubleValue ?? 0
    let pitch = observation.pitch?.doubleValue ?? 0
    let roll = observation.roll?.doubleValue ?? 0
    return ["yaw": yaw, "pitch": pitch, "roll": roll]
  }

  private func normalizeEmbedding(_ embedding: [Float]) -> [Float] {
    var norm: Float = 0
    for value in embedding {
      norm += value * value
    }
    norm = sqrt(norm)
    if norm > 0 {
      return embedding.map { $0 / norm }
    }
    return embedding
  }

  private func resizeImage(_ image: UIImage, to size: CGSize) -> UIImage {
    UIGraphicsBeginImageContextWithOptions(size, false, 0.0)
    image.draw(in: CGRect(origin: .zero, size: size))
    let resized = UIGraphicsGetImageFromCurrentImageContext()!
    UIGraphicsEndImageContext()
    return resized
  }

  private func createPixelBuffer(from image: UIImage) throws -> CVPixelBuffer {
    let attrs = [kCVPixelBufferCGImageCompatibilityKey: kCFBooleanTrue,
                 kCVPixelBufferCGBitmapContextCompatibilityKey: kCFBooleanTrue] as CFDictionary

    var pixelBuffer: CVPixelBuffer?
    let status = CVPixelBufferCreate(
      kCFAllocatorDefault,
      Int(image.size.width),
      Int(image.size.height),
      kCVPixelFormatType_32ARGB,
      attrs,
      &pixelBuffer
    )

    guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
      throw NSError(domain: "PixelBuffer", code: -1, userInfo: nil)
    }

    CVPixelBufferLockBaseAddress(buffer, CVPixelBufferLockFlags(rawValue: 0))
    let pixelData = CVPixelBufferGetBaseAddress(buffer)
    let context = CGContext(
      data: pixelData,
      width: Int(image.size.width),
      height: Int(image.size.height),
      bitsPerComponent: 8,
      bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
    )

    if let cgImage = image.cgImage, let context = context {
      context.draw(cgImage, in: CGRect(origin: .zero, size: image.size))
    }
    CVPixelBufferUnlockBaseAddress(buffer, CVPixelBufferLockFlags(rawValue: 0))
    return buffer
  }
}
