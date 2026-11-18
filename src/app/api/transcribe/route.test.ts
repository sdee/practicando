import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser } }) }));

import { POST } from './route';

const audio = (bytes = 100) => new File([new Uint8Array(bytes)], 'answer.webm', { type: 'audio/webm' });
function request(opts: { token?: string | null; file?: File | null; verb?: string } = {}) {
  const form = new FormData();
  if (opts.file !== null) form.append('audio', opts.file ?? audio());
  form.append('verb', opts.verb ?? 'tener');
  const headers: Record<string, string> = {};
  if (opts.token !== null) headers.authorization = `Bearer ${opts.token ?? 'good'}`;
  return new Request('http://x/api/transcribe', { method: 'POST', body: form, headers });
}

beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'sk-test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://p.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub');
  getUser.mockResolvedValue({ data: { user: { id: 'u' } }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('POST /api/transcribe', () => {
  it('503s as JSON when the key is not configured', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/OPENAI_API_KEY/);
  });

  it('requires a signed-in user', async () => {
    expect((await POST(request({ token: null }))).status).toBe(401);
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
    const res = await POST(request({ token: 'forged' }));
    expect(res.status).toBe(401);
    expect(typeof (await res.json()).error).toBe('string');
  });

  it('rejects missing and oversized audio before calling OpenAI', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect((await POST(request({ file: null }))).status).toBe(400);
    expect((await POST(request({ file: audio(3 * 1024 * 1024) }))).status).toBe(413);
    expect(f).not.toHaveBeenCalled();
  });

  it('forwards to Whisper (Spanish, no target form leaked) and returns the text', async () => {
    const f = vi.fn().mockResolvedValue(Response.json({ text: 'Tengo.' }));
    vi.stubGlobal('fetch', f);
    const res = await POST(request({ verb: 'tener' }));
    expect(await res.json()).toEqual({ text: 'Tengo.' });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
    const sent = init.body as FormData;
    expect(sent.get('language')).toBe('es');
    expect(sent.get('prompt')).toBe('Conjugación del verbo tener en español.');
  });

  it('turns upstream failures into JSON 502s', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: { message: 'quota' } }, { status: 429 })));
    const res = await POST(request());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('Transcription service error (429)'); // provider text stays server-side
  });
});
