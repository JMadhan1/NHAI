import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore, useSyncStore } from '@/store/authStore';
import { getAllEmbeddings, getAuthHistory, getUnsyncedAttempts } from '@/lib/storage';

export default function Home() {
  const enrolledUsers = useAuthStore((state) => state.enrolledUsers);
  const setEnrolledUsers = useAuthStore((state) => state.setEnrolledUsers);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);
  const isOnline = useSyncStore((state) => state.isOnline);

  useEffect(() => {
    const loadData = async () => {
      const embeddings = await getAllEmbeddings();
      const attempts = await getAuthHistory();
      const unsynced = await getUnsyncedAttempts(1000);

      setEnrolledUsers(embeddings);
      setTotalAttempts(attempts.length);
      setPendingSync(unsynced.length);
    };

    loadData();
  }, [setEnrolledUsers]);

  return (
    <>
      <Head>
        <title>FaceAuth Offline - Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-white mb-2">FaceAuth Offline</h1>
            <p className="text-slate-400 text-lg">Facial Recognition & Liveness Detection</p>
            <p className="text-slate-500 text-sm mt-2">Progressive Web Application</p>
          </div>

          {/* Status Bar */}
          <div className="mb-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`}
                />
                <span className="text-slate-300">
                  {isOnline ? 'Online' : 'Offline Mode'}
                </span>
              </div>
              {pendingSync > 0 && (
                <span className="text-yellow-400 text-sm">{pendingSync} records pending sync</span>
              )}
            </div>
          </div>

          {/* Main Menu */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Link href="/auth">
              <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg hover:border-blue-500 hover:bg-slate-700 transition cursor-pointer">
                <div className="text-4xl mb-3">🔐</div>
                <h3 className="text-xl font-bold text-white mb-1">Authenticate</h3>
                <p className="text-slate-400 text-sm">Login with your face</p>
              </div>
            </Link>

            <Link href="/enroll">
              <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg hover:border-green-500 hover:bg-slate-700 transition cursor-pointer">
                <div className="text-4xl mb-3">👤</div>
                <h3 className="text-xl font-bold text-white mb-1">Enroll User</h3>
                <p className="text-slate-400 text-sm">Register a new face</p>
              </div>
            </Link>

            <Link href="/history">
              <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg hover:border-purple-500 hover:bg-slate-700 transition cursor-pointer">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-xl font-bold text-white mb-1">Auth History</h3>
                <p className="text-slate-400 text-sm">View past attempts</p>
              </div>
            </Link>

            <Link href="/admin">
              <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg hover:border-orange-500 hover:bg-slate-700 transition cursor-pointer">
                <div className="text-4xl mb-3">⚙️</div>
                <h3 className="text-xl font-bold text-white mb-1">Admin Panel</h3>
                <p className="text-slate-400 text-sm">Manage users</p>
              </div>
            </Link>
          </div>

          {/* System Stats */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">System Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Enrolled Users</p>
                <p className="text-3xl font-bold text-white">{enrolledUsers.length}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Attempts</p>
                <p className="text-3xl font-bold text-white">{totalAttempts}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Pending Sync</p>
                <p className="text-3xl font-bold text-yellow-400">{pendingSync}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Connection</p>
                <p className={`text-3xl font-bold ${isOnline ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isOnline ? '✅' : '⚠️'}
                </p>
              </div>
            </div>
          </div>

          {/* Features Info */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded">
              <h3 className="text-blue-400 font-bold mb-2">🔒 Security</h3>
              <p className="text-slate-300 text-sm">AES-256 encryption, IndexedDB storage</p>
            </div>
            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded">
              <h3 className="text-green-400 font-bold mb-2">📱 Cross-Platform</h3>
              <p className="text-slate-300 text-sm">Works on Web, Android, and iOS</p>
            </div>
            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded">
              <h3 className="text-purple-400 font-bold mb-2">📡 Offline-First</h3>
              <p className="text-slate-300 text-sm">Functions without internet, syncs on reconnect</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
