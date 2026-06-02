import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export default function InstallPrompt() {
  const { isInstallable, isInstalled, isIOS, handleInstall } = useInstallPrompt();

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-up">
          <div className="card-modern glass-strong border-emerald-500/50 border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-white mb-1">Install FaceAuth</h3>
                <p className="text-sm text-gray-300">
                  Install the app on your device for easy access and offline use.
                </p>
              </div>
              <button
                onClick={handleInstall}
                className="flex-shrink-0 px-4 py-2 rounded-lg gradient-success text-white font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                ⬇️ Install
              </button>
            </div>
          </div>
        </div>
      )}

      {isIOS && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-up">
          <div className="card-modern glass-strong border-blue-500/50 border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-white mb-1">Install on iOS</h3>
                <p className="text-sm text-gray-300">
                  Tap the share button and select "Add to Home Screen" to install.
                </p>
              </div>
              <button
                onClick={() => {}}
                className="flex-shrink-0 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                ℹ️ How
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
