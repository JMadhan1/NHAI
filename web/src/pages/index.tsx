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

  const menuItems = [
    {
      href: '/auth',
      icon: '🔐',
      title: 'Authenticate',
      description: 'Login with your face',
      gradient: 'from-indigo-500 to-purple-500',
      color: 'indigo',
    },
    {
      href: '/enroll',
      icon: '👤',
      title: 'Enroll User',
      description: 'Register a new face',
      gradient: 'from-emerald-500 to-teal-500',
      color: 'emerald',
    },
    {
      href: '/history',
      icon: '📋',
      title: 'Auth History',
      description: 'View past attempts',
      gradient: 'from-cyan-500 to-blue-500',
      color: 'cyan',
    },
    {
      href: '/admin',
      icon: '⚙️',
      title: 'Admin Panel',
      description: 'Manage users',
      gradient: 'from-orange-500 to-red-500',
      color: 'orange',
    },
  ];

  return (
    <>
      <Head>
        <title>FaceAuth Offline - Dashboard</title>
      </Head>

      <div className="min-h-screen overflow-hidden">
        {/* Animated background elements */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-16 animate-slide-up">
            <div className="space-y-4 mb-8">
              <h1 className="text-6xl sm:text-7xl font-bold">
                <span className="text-gradient">FaceAuth Offline</span>
              </h1>
              <p className="text-xl text-gray-300">Secure facial recognition & liveness detection</p>
              <p className="text-sm text-gray-400">Progressive Web Application • Works Offline</p>
            </div>
          </div>

          {/* Status Bar */}
          <div className="mb-12 card-modern hover-scale">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-yellow-500'} animate-pulse`}></div>
                  <div className={`absolute inset-0 w-4 h-4 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-yellow-500'} animate-pulse` + (isOnline ? ' opacity-75' : ' opacity-50')}></div>
                </div>
                <span className="text-lg font-medium">
                  {isOnline ? '🟢 Online & Ready' : '🟡 Offline Mode'}
                </span>
              </div>
              {pendingSync > 0 && (
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium">
                  ⏱️ {pendingSync} pending sync
                </span>
              )}
            </div>
          </div>

          {/* Main Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {menuItems.map((item, idx) => (
              <Link key={item.href} href={item.href} className="group card-modern hover-scale cursor-pointer h-full relative overflow-hidden block" style={{ animationDelay: `${idx * 0.1}s` }}>
                {/* Gradient overlay */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${item.gradient} blur-xl -z-10`}></div>

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full">
                  <div className="text-5xl mb-4 group-hover:scale-125 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all">
                    {item.title}
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors flex-grow">
                    {item.description}
                  </p>
                  <div className="mt-4 flex items-center text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">Start →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* System Stats */}
          <div className="card-modern mb-12">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white">System Status</h2>
              <p className="text-gray-400 text-sm mt-2">Real-time system information</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Enrolled Users', value: enrolledUsers.length, color: 'indigo' },
                { label: 'Total Attempts', value: totalAttempts, color: 'cyan' },
                { label: 'Pending Sync', value: pendingSync, color: 'amber' },
                { label: 'Connection', value: isOnline ? '✅' : '⚠️', color: isOnline ? 'emerald' : 'yellow' },
              ].map((stat, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <p className="text-gray-400 text-sm font-medium mb-3">{stat.label}</p>
                  <div className={`text-4xl font-bold bg-gradient-to-r ${
                    stat.color === 'indigo' ? 'from-indigo-400 to-purple-400' :
                    stat.color === 'cyan' ? 'from-cyan-400 to-blue-400' :
                    stat.color === 'amber' ? 'from-amber-400 to-orange-400' :
                    'from-emerald-400 to-teal-400'
                  } bg-clip-text text-transparent group-hover:scale-110 transition-transform`}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🔒',
                title: 'Enterprise Security',
                description: 'AES-256 encryption, secure IndexedDB storage',
                gradient: 'from-blue-600/20 to-indigo-600/20',
                borderColor: 'border-blue-500/30',
              },
              {
                icon: '📱',
                title: 'Cross-Platform',
                description: 'Seamlessly works on Web, Android, and iOS',
                gradient: 'from-emerald-600/20 to-teal-600/20',
                borderColor: 'border-emerald-500/30',
              },
              {
                icon: '⚡',
                title: 'Offline-First',
                description: 'Full functionality without internet, auto-sync',
                gradient: 'from-purple-600/20 to-pink-600/20',
                borderColor: 'border-purple-500/30',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className={`group card-modern hover-scale ${feature.borderColor} border`}
                style={{
                  background: `linear-gradient(135deg, ${feature.gradient.split(' ')[1]} 0%, ${feature.gradient.split(' ')[3]} 100%)`,
                }}
              >
                <div className="text-4xl mb-4 group-hover:animate-float">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
