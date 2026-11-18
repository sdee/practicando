// Hosted Whisper transcription. OPENAI_API_KEY stays server-side (a Netlify env var, set for
// every deploy context). Only signed-in users may call it — it spends money — and it always
// returns JSON, even on error.
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 2 * 1024 * 1024; // a spoken word is a few KB; this is generous

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request): Promise<Response> {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return fail('Voice answers are not set up on this server (OPENAI_API_KEY).', 503);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!url || !anon || !token) return fail('Sign in to use voice answers.', 401);
    const { data: user, error: authError } = await createClient(url, anon).auth.getUser(token);
    if (authError || !user.user) return fail('Sign in to use voice answers.', 401);

    const inForm = await req.formData();
    const audio = inForm.get('audio');
    const verb = String(inForm.get('verb') ?? '').slice(0, 40);
    if (!(audio instanceof Blob) || audio.size === 0) return fail('No audio provided.', 400);
    if (audio.size > MAX_BYTES) return fail('Recording too long.', 413);

    const out = new FormData();
    out.append('file', audio, (audio as File).name || 'answer.webm');
    out.append('model', 'whisper-1');
    out.append('language', 'es'); // avoids English mis-transcription
    out.append('temperature', '0');
    // Context WITHOUT the target form, so recognition is honest rather than an echo.
    if (verb) out.append('prompt', `Conjugación del verbo ${verb} en español.`);

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: out,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      // Log the provider's message server-side; the client gets a generic one.
      console.error('[transcribe] OpenAI', r.status, data?.error?.message);
      return fail(`Transcription service error (${r.status})`, 502);
    }
    return Response.json({ text: typeof data.text === 'string' ? data.text : '' });
  } catch {
    return fail('Transcription failed.', 500);
  }
}
