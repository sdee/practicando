'use client';

import { useSession } from '@/components/AuthGate';
import { SCHEMA, supabase } from '@/lib/supabase';
import { getBuildInfo, shortSha } from '@/lib/pwa-env/build-info';

export default function AccountPage() {
  const session = useSession();
  const build = getBuildInfo();
  return (
    <div className="min-h-[calc(100dvh-56px)] bg-gradient-to-br from-pink-200 via-purple-200 to-yellow-200 p-4 pt-safe">
      <div className="max-w-md mx-auto pt-8 space-y-4">
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/80">
          <div className="text-sm text-slate-500">Signed in as</div>
          <div className="font-semibold text-slate-800 break-all">{session?.user.email}</div>
          <button
            onClick={() => supabase().auth.signOut()}
            className="mt-4 w-full bg-slate-200 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-300 transition-colors"
          >
            Sign out
          </button>
        </div>
        <div className="text-center text-xs text-slate-500">
          {build.env} · {SCHEMA} · {shortSha(build.sha)} · v{build.version}
        </div>
      </div>
    </div>
  );
}
