'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/practice');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-300 via-orange-300 to-indigo-400 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-white text-lg">Loading Spanish Practice...</div>
      </div>
    </div>
  );
}
