import { createClient } from '@supabase/supabase-js';
import { getBuildInfo } from '@/lib/pwa-env/build-info';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * One Supabase project (Listo's, shared), one schema per environment. The schema is derived
 * from the build's environment — never configured — so a production build physically cannot
 * talk to the dev schema, or the reverse. Local `next dev` is the `dev` environment, so
 * testing never touches production progress. See docs/deploy.md.
 */
export const SCHEMA = getBuildInfo().env === 'production' ? 'practicando' : 'practicando_dev';

/** Set when the build has a Supabase project (see docs/deploy.md). */
export const supabaseConfigured = !!(URL && KEY);

const connect = () =>
  createClient(URL!, KEY!, {
    db: { schema: SCHEMA },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // Google sends you back with ?code=…
      flowType: 'pkce',
      storageKey: `practicando-auth-${SCHEMA}`, // dev and prod never share a session
    },
  });

let client: ReturnType<typeof connect> | null = null;

export function supabase() {
  if (!supabaseConfigured) throw new Error("Supabase isn't configured in this build (see .env.local.example).");
  client ??= connect();
  return client;
}

/** Google sign-in as a full-page redirect (works in an installed Home Screen app). */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/practice`, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
}
