import Foundation
import Network

class SyncManager {
  private let monitor = NWPathMonitor()
  private let queue = DispatchQueue.global(qos: .default)
  private var isOnline = false
  private var syncInProgress = false
  private let SYNC_INTERVAL: TimeInterval = 30

  func startMonitoring(onStatusChange: @escaping (Bool) -> Void) {
    monitor.pathUpdateHandler = { path in
      let isOnline = path.status == .satisfied
      self.isOnline = isOnline
      DispatchQueue.main.async {
        onStatusChange(isOnline)
      }
    }
    monitor.start(queue: queue)
  }

  func stopMonitoring() {
    monitor.cancel()
  }

  func isNetworkAvailable() -> Bool {
    return isOnline
  }

  func startAutoSync(onSyncComplete: @escaping (Bool) -> Void) {
    DispatchQueue.global(qos: .default).async {
      while self.isOnline {
        if !self.syncInProgress {
          self.performSync(onSyncComplete: onSyncComplete)
        }
        Thread.sleep(forTimeInterval: self.SYNC_INTERVAL)
      }
    }
  }

  func stopAutoSync() {
    syncInProgress = false
  }

  private func performSync(onSyncComplete: @escaping (Bool) -> Void) {
    syncInProgress = true
    DispatchQueue.main.async {
      onSyncComplete(true)
    }
    syncInProgress = false
  }

  func isSyncInProgress() -> Bool {
    return syncInProgress
  }
}
