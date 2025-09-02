'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import './globals.css';
import Navigation from '@/components/Navigation';
import { AppState, getAppState } from '@/lib/appState';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [appState, setLocalAppState] = useState<AppState>(getAppState());
  const pathname = usePathname();

  // Determine if current page should have no-scroll layout
  const isNoScrollPage = pathname === '/practice' || pathname === '/';

  // Sync global state changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentGlobalState = getAppState();
      if (JSON.stringify(appState) !== JSON.stringify(currentGlobalState)) {
        setLocalAppState({ ...currentGlobalState });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [appState]);

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        />
      </head>
      <body className={isNoScrollPage ? "h-screen overflow-hidden" : "min-h-screen"}>
        <div className={isNoScrollPage ? "h-full flex flex-col" : "min-h-screen flex flex-col"}>
          <Navigation 
            hasActiveRound={appState.hasActiveRound}
            currentRoundId={appState.currentRoundId}
          />
          <main className={isNoScrollPage ? "flex-1 overflow-hidden" : "flex-1"}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
