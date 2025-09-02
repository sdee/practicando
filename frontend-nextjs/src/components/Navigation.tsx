'use client';

import { usePathname, useRouter } from 'next/navigation';

interface NavigationProps {
  hasActiveRound: boolean;
  currentRoundId: number | null;
}

export default function Navigation({ hasActiveRound, currentRoundId }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { id: 'practice', label: '🎯 Practice', path: '/practice' },
    { id: 'history', label: '📊 History', path: '/history' },
    { id: 'metrics', label: '📈 Metrics', path: '/metrics' },
  ];

  const handleTabClick = (path: string) => {
    // Navigate directly - progress is auto-saved
    router.push(path);
  };

  return (
    <>
      {/* Navigation Bar */}
      <nav className="bg-gradient-to-r from-pink-200/90 via-purple-200/90 to-indigo-200/90 backdrop-blur-md border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            {/* App Title */}
            <div className="flex items-center">
              <h1 className="text-lg font-bold text-slate-700">
                Spanish Practice
              </h1>
            </div>

            {/* Tab Navigation - Centered */}
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const isActive = pathname === tab.path || (pathname === '/' && tab.path === '/practice');
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.path)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white/50 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Empty space for symmetry */}
            <div className="flex items-center">
              <div className="w-16"></div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
