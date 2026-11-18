import { supabase } from '@/lib/supabase';

/** Client-side transcribe boundary (swap for on-device later without touching the UI). */
export async function transcribe(blob: Blob, ctx: { verb: string }): Promise<string> {
  const ext = blob.type.includes('mp4') || blob.type.includes('aac') ? 'mp4' : blob.type.includes('webm') ? 'webm' : 'wav';
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');

  const form = new FormData();
  form.append('audio', blob, `answer.${ext}`);
  form.append('verb', ctx.verb);
  const res = await fetch('/api/transcribe', { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Transcription failed (${res.status})`);
  return String(body.text ?? '');
}
