import Foundation

class FaceEmbeddingEngine {
  private let tfliteEngine: TFLiteInferenceEngine

  init(_ engine: TFLiteInferenceEngine) {
    tfliteEngine = engine
  }

  func computeEmbedding(_ image: UIImage) -> [Float]? {
    do {
      if let embedding = try tfliteEngine.getEmbedding(image) {
        return normalizeEmbedding(embedding)
      }
      return nil
    } catch {
      print("Failed to compute embedding: \(error.localizedDescription)")
      return nil
    }
  }

  func cosineSimilarity(_ a: [Float], _ b: [Float]) -> Float {
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
}
