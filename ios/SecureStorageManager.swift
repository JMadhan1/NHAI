import Foundation
import Security

class SecureStorageManager {
  private let service = "com.faceauthoffline.keychain"

  func saveString(_ key: String, value: String) {
    guard let data = value.data(using: .utf8) else { return }

    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    ]

    SecItemDelete(query as CFDictionary)
    SecItemAdd(query as CFDictionary, nil)
  }

  func getString(_ key: String, defaultValue: String = "") -> String {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
      kSecReturnData as String: true
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    if status == errSecSuccess, let data = result as? Data {
      return String(data: data, encoding: .utf8) ?? defaultValue
    }
    return defaultValue
  }

  func saveLong(_ key: String, value: Int64) {
    saveString(key, value: String(value))
  }

  func getLong(_ key: String, defaultValue: Int64 = 0) -> Int64 {
    let stringValue = getString(key)
    return Int64(stringValue) ?? defaultValue
  }

  func saveBoolean(_ key: String, value: Bool) {
    saveString(key, value: value ? "true" : "false")
  }

  func getBoolean(_ key: String, defaultValue: Bool = false) -> Bool {
    let stringValue = getString(key)
    return stringValue == "true" ? true : defaultValue
  }

  func remove(_ key: String) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key
    ]
    SecItemDelete(query as CFDictionary)
  }

  func clear() {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service
    ]
    SecItemDelete(query as CFDictionary)
  }
}
