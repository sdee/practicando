// Client-side transcribe boundary. Swap this implementation for on-device
// (transformers.js) later without touching the UI.
export async function transcribe(blob: Blob, ctx: { verb: string }): Promise<string> {
  const ext = blob.type.includes('mp4') || blob.type.includes('aac')
    ? 'mp4'
    : blob.type.includes('webm')
      ? 'webm'
      : 'wav';

  const form = new FormData();
  form.append('audio', blob, `answer.${ext}`);
  form.append('verb', ctx.verb);

  const res = await fetch('/api/transcribe', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Transcription failed (${res.status})`);
  return (data.text || '').trim();
}
