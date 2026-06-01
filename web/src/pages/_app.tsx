import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { useSyncStore } from '@/store/authStore';
import { initializeTFLite } from '@/lib/tfjs';
import { getAllEmbeddings, getAuthHistory, getUnsyncedAttempts } from '@/lib/storage';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const setOnline = useSyncStore((state) => state.setOnline);
  const setPendingCount = useSyncStore((state) => state.setPendingCount);

  useEffect(() => {
    // Initialize TensorFlow.js
    initializeTFLite().catch((err) => console.error('TFLite init failed:', err));

    // Setup network listener
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial online status
    setOnline(navigator.onLine);

    // Load pending sync count
    getUnsyncedAttempts(1000).then((attempts) => setPendingCount(attempts.length));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, setPendingCount]);

  return (
    <>
      <Head>
        <title>FaceAuth Offline - Web</title>
        <meta name="description" content="Offline facial recognition and liveness detection" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1a1a2e" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Component {...pageProps} />
      </main>
    </>
  );
}
