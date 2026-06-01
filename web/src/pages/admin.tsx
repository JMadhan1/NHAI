import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { getAllEmbeddings, deleteEmbedding } from '@/lib/storage';
import type { FaceEmbedding } from '@/types';
import { format } from 'date-fns';

export default function AdminPage() {
  const [embeddings, setEmbeddings] = useState<FaceEmbedding[]>([]);
  const [loading, setLoading] = useState(true);
  const setEnrolledUsers = useAuthStore((state) => state.setEnrolledUsers);

  useEffect(() => {
    const loadUsers = async () => {
      const users = await getAllEmbeddings();
      setEmbeddings(users);
      setEnrolledUsers(users);
      setLoading(false);
    };

    loadUsers();
  }, [setEnrolledUsers]);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}?`)) {
      return;
    }

    try {
      await deleteEmbedding(userId);
      const updated = await getAllEmbeddings();
      setEmbeddings(updated);
      setEnrolledUsers(updated);
      alert(`${userName} has been deleted`);
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/">
          <a className="text-blue-400 hover:text-blue-300 mb-6 inline-block">← Back</a>
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-slate-400">Manage enrolled users and system configuration</p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-6 text-blue-300">
          <p className="text-sm">
            All user data is encrypted locally using IndexedDB. Face embeddings are 128-dimensional
            vectors stored securely.
          </p>
        </div>

        {/* Users Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Enrolled Users ({embeddings.length})</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-slate-400">Loading...</div>
          ) : embeddings.length === 0 ? (
            <div className="p-6 text-center text-slate-400">No enrolled users</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold">Name</th>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold">User ID</th>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold">Enrolled</th>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold">Embedding</th>
                    <th className="px-6 py-3 text-right text-slate-300 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {embeddings.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-6 py-4 text-white font-bold">{user.userName}</td>
                      <td className="px-6 py-4 text-slate-300">{user.userId}</td>
                      <td className="px-6 py-4 text-slate-400">
                        {format(new Date(user.enrolledAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{user.vector.length}D vector</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(user.userId, user.userName)}
                          className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded transition text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* System Info */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Database</p>
            <p className="text-lg font-bold text-white">IndexedDB</p>
            <p className="text-xs text-slate-500 mt-1">Browser-based encryption</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Sync Status</p>
            <p className="text-lg font-bold text-green-400">Offline-First</p>
            <p className="text-xs text-slate-500 mt-1">Auto-sync when online</p>
          </div>
        </div>
      </div>
    </div>
  );
}
