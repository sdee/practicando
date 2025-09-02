'use client';

import { useState, useEffect } from 'react';
import './globals.css';
import Navigation from '@/components/Navigation';
import { AppState, getAppState } from '@/lib/appState';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [appState, setLocalAppState] = useState<AppState>(getAppState());

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
      <body>
        <Navigation 
          hasActiveRound={appState.hasActiveRound}
          currentRoundId={appState.currentRoundId}
        />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
