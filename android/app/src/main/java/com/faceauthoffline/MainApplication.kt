package com.faceauthoffline

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.common.LifecycleState
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoLoader

class MainApplication : Application(), ReactApplication {

  private val mReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> {
          val packages = PackageList(this).packages
          packages.add(FaceAuthPackage())
          return packages
        }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean
          get() = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

        override val isHermesEnabled: Boolean
          get() = BuildConfig.IS_HERMES_ENABLED
      }

  override fun getReactNativeHost(): ReactNativeHost = mReactNativeHost

  private val mReactHost: ReactHost by lazy { getDefaultReactHost(applicationContext, mReactNativeHost) }

  override fun getReactHost(): ReactHost = mReactHost

  override fun onCreate() {
    super.onCreate()
    OpenSourceMergedSoLoader.load()
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
  }
}
