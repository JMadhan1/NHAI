package com.faceauthoffline

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import android.util.Log
import java.security.KeyStore

class SecureStorageManager(context: Context) {
  private val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

  private val encryptedSharedPreferences: SharedPreferences = EncryptedSharedPreferences.create(
    context,
    "encrypted_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
  )

  fun saveString(key: String, value: String) {
    try {
      encryptedSharedPreferences.edit().putString(key, value).apply()
      Log.d(TAG, "Saved encrypted string for key: $key")
    } catch (e: Exception) {
      Log.e(TAG, "Failed to save encrypted string: ${e.message}")
    }
  }

  fun getString(key: String, defaultValue: String = ""): String {
    return try {
      encryptedSharedPreferences.getString(key, defaultValue) ?: defaultValue
    } catch (e: Exception) {
      Log.e(TAG, "Failed to retrieve encrypted string: ${e.message}")
      defaultValue
    }
  }

  fun saveLong(key: String, value: Long) {
    try {
      encryptedSharedPreferences.edit().putLong(key, value).apply()
    } catch (e: Exception) {
      Log.e(TAG, "Failed to save encrypted long: ${e.message}")
    }
  }

  fun getLong(key: String, defaultValue: Long = 0L): Long {
    return try {
      encryptedSharedPreferences.getLong(key, defaultValue)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to retrieve encrypted long: ${e.message}")
      defaultValue
    }
  }

  fun saveBoolean(key: String, value: Boolean) {
    try {
      encryptedSharedPreferences.edit().putBoolean(key, value).apply()
    } catch (e: Exception) {
      Log.e(TAG, "Failed to save encrypted boolean: ${e.message}")
    }
  }

  fun getBoolean(key: String, defaultValue: Boolean = false): Boolean {
    return try {
      encryptedSharedPreferences.getBoolean(key, defaultValue)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to retrieve encrypted boolean: ${e.message}")
      defaultValue
    }
  }

  fun remove(key: String) {
    try {
      encryptedSharedPreferences.edit().remove(key).apply()
    } catch (e: Exception) {
      Log.e(TAG, "Failed to remove key: ${e.message}")
    }
  }

  fun clear() {
    try {
      encryptedSharedPreferences.edit().clear().apply()
      Log.d(TAG, "Cleared all encrypted preferences")
    } catch (e: Exception) {
      Log.e(TAG, "Failed to clear preferences: ${e.message}")
    }
  }

  companion object {
    private const val TAG = "SecureStorageManager"
  }
}
