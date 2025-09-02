'use client';

import { Suspense } from 'react';
import History from '@/components/History';

function HistoryLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-yellow-200 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-slate-600 text-lg">Loading history...</div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistoryLoading />}>
      <History />
    </Suspense>
  );
}
