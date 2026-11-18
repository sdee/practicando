'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { signInWithGoogle, supabase, supabaseConfigured } from '@/lib/supabase';

const SessionContext = createContext<Session | null>(null);
export const useSession = () => useContext(SessionContext);

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-pink-300 via-orange-300 to-indigo-400 flex items-center justify-center p-6 pt-safe pb-safe">
      <div className="text-center text-white max-w-sm">{children}</div>
    </div>
  );
}

/**
 * Full-screen Google sign-in before anything renders — progress lives in the account, so
 * nothing is practiced anonymously and lost. Server render = splash only (no hydration mismatch).
 */
export function AuthGate({ appName, iconSrc, children }: { appName: string; iconSrc: string; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) { setReady(true); return; }
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <Screen><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" /></Screen>;

  if (!supabaseConfigured) {
    return (
      <Screen>
        <h1 className="text-xl font-bold mb-2">Not configured</h1>
        <p className="text-sm">This build has no Supabase settings. Run <code>npm run db:setup</code> (see docs/deploy.md).</p>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} alt="" width={96} height={96} className="mx-auto mb-4 rounded-2xl shadow-lg" />
        <h1 className="text-3xl font-bold mb-2">{appName}</h1>
        <p className="mb-6 text-white/90">Endless Spanish verb practice. Sign in to keep your progress.</p>
        <button
          onClick={() => signInWithGoogle().catch((e) => setError(e instanceof Error ? e.message : 'Sign-in failed'))}
          className="w-full bg-white text-slate-800 font-semibold py-3 rounded-xl shadow hover:bg-slate-50 transition-colors"
        >
          Continue with Google
        </button>
        {error && <p className="mt-3 text-sm bg-red-500/80 rounded-lg p-2">{error}</p>}
      </Screen>
    );
  }

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
