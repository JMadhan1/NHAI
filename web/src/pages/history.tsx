import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuthHistory, getAuthAttemptCount, getSuccessfulAuthCount } from '@/lib/storage';
import type { AuthAttempt } from '@/types';
import { format } from 'date-fns';

export default function HistoryPage() {
  const [attempts, setAttempts] = useState<AuthAttempt[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const history = await getAuthHistory(100);
      const total = await getAuthAttemptCount();
      const successes = await getSuccessfulAuthCount();

      setAttempts(history);
      setTotalCount(total);
      setSuccessCount(successes);
      setLoading(false);
    };

    loadData();
  }, []);

  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  const getResultColor = (result: string) => {
    switch (result) {
      case 'SUCCESS':
        return 'bg-green-900/20 border-green-500 text-green-300';
      case 'FAIL_LIVENESS':
        return 'bg-yellow-900/20 border-yellow-500 text-yellow-300';
      default:
        return 'bg-red-900/20 border-red-500 text-red-300';
    }
  };

  const getResultLabel = (result: string) => {
    switch (result) {
      case 'SUCCESS':
        return '✅ Success';
      case 'FAIL_LIVENESS':
        return '⚠️ Liveness Failed';
      case 'FAIL_NO_MATCH':
        return '❌ No Match';
      case 'FAIL_NO_FACE':
        return '❌ No Face';
      default:
        return '❓ Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/">
          <a className="text-blue-400 hover:text-blue-300 mb-6 inline-block">← Back</a>
        </Link>

        <h1 className="text-3xl font-bold text-white mb-6">Authentication History</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Total Attempts</p>
            <p className="text-3xl font-bold text-white">{totalCount}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Successful</p>
            <p className="text-3xl font-bold text-green-400">{successCount}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Success Rate</p>
            <p className="text-3xl font-bold text-blue-400">{successRate}%</p>
          </div>
        </div>

        {/* Attempts List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : attempts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No authentication attempts yet</div>
        ) : (
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className={`p-4 border rounded-lg ${getResultColor(attempt.result)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-bold">{getResultLabel(attempt.result)}</span>
                  <span className="text-sm opacity-75">
                    {format(new Date(attempt.timestamp), 'MMM dd, HH:mm:ss')}
                  </span>
                </div>

                {attempt.userId && (
                  <p className="text-sm mb-1">User: {attempt.userId}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <div>Confidence: {(attempt.confidence * 100).toFixed(1)}%</div>
                  <div>Liveness: {(attempt.livenessScore * 100).toFixed(0)}%</div>
                </div>

                {attempt.synced && (
                  <p className="text-xs mt-2 opacity-75">✓ Synced to server</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
