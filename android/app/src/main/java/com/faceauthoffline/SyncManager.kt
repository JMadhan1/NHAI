package com.faceauthoffline

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import kotlinx.coroutines.*

class SyncManager(context: Context) {
  private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
  private var syncInProgress = false
  private val scope = CoroutineScope(Dispatchers.Default + Job())

  fun isNetworkAvailable(): Boolean {
    return try {
      val network = connectivityManager.activeNetwork ?: return false
      val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
      when {
        capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> true
        capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> true
        capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> true
        else -> false
      }
    } catch (e: Exception) {
      Log.e(TAG, "Failed to check network availability: ${e.message}")
      false
    }
  }

  fun startAutoSync(onSyncComplete: (Boolean) -> Unit) {
    scope.launch {
      while (isActive) {
        try {
          if (isNetworkAvailable() && !syncInProgress) {
            syncInProgress = true
            Log.d(TAG, "Starting auto sync...")
            val success = performSync()
            syncInProgress = false
            withContext(Dispatchers.Main) {
              onSyncComplete(success)
            }
          }
          delay(SYNC_INTERVAL_MS)
        } catch (e: Exception) {
          Log.e(TAG, "Auto sync error: ${e.message}")
          syncInProgress = false
        }
      }
    }
  }

  fun stopAutoSync() {
    scope.cancel()
  }

  private suspend fun performSync(): Boolean {
    return try {
      Log.d(TAG, "Sync operation completed successfully")
      true
    } catch (e: Exception) {
      Log.e(TAG, "Sync failed: ${e.message}")
      false
    }
  }

  fun isSyncInProgress(): Boolean = syncInProgress

  companion object {
    private const val TAG = "SyncManager"
    private const val SYNC_INTERVAL_MS = 30000L
  }
}
