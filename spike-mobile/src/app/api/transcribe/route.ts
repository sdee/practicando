// Spike B — hosted Whisper transcription.
// Holds OPENAI_API_KEY server-side (never shipped to the client). On Netlify this
// deploys as a serverless function — the exact "key in a route handler" pattern
// planned for Stage 4. Always returns JSON, even on error.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not set on the server (add it in Netlify env / .env.local).' },
      { status: 500 }
    );
  }

  try {
    const inForm = await req.formData();
    const audio = inForm.get('audio');
    const verb = (inForm.get('verb') as string) || '';

    if (!(audio instanceof Blob)) {
      return Response.json({ error: 'No audio provided.' }, { status: 400 });
    }

    const filename = (audio as File).name || 'answer.webm';
    const oaForm = new FormData();
    oaForm.append('file', audio, filename);
    oaForm.append('model', 'whisper-1');
    oaForm.append('language', 'es'); // bias to Spanish — avoids English mis-transcription
    oaForm.append('temperature', '0');
    // Mild context (the app knows the verb) WITHOUT leaking the target form,
    // so we measure honest recognition, not an echo of the answer.
    if (verb) oaForm.append('prompt', `Conjugación del verbo ${verb} en español.`);

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: oaForm,
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const message =
        (data && data.error && data.error.message) || `OpenAI error (${r.status})`;
      return Response.json({ error: message }, { status: 502 });
    }

    return Response.json({ text: typeof data.text === 'string' ? data.text : '' });
  } catch {
    return Response.json({ error: 'Transcription failed.' }, { status: 500 });
  }
}
