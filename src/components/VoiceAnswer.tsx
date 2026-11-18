'use client';

import { useState } from 'react';
import { Mic } from 'lucide-react';
import { useRecorder } from '@/hooks/useRecorder';
import { transcribe } from '@/lib/transcribe';
import { cleanTranscript } from '@/lib/voice';

type Phase = 'idle' | 'recording' | 'transcribing';

/** Tap, say the conjugation, tap again; the transcript goes to `onTranscript`. */
export default function VoiceAnswer({ verb, disabled, onTranscript }: {
  verb: string;
  disabled?: boolean;
  onTranscript: (text: string) => void;
}) {
  const rec = useRecorder();
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  if (!rec.isSupported) return null; // typing still works

  const onMic = async () => {
    if (disabled || phase === 'transcribing') return;
    if (phase === 'idle') {
      try {
        await rec.start();
        setMsg(null);
        setPhase('recording');
      } catch {
        setMsg('Mic permission denied or unavailable.');
      }
      return;
    }
    const blob = await rec.stop();
    if (!blob) { setPhase('idle'); setMsg('No audio captured — try again.'); return; }
    setPhase('transcribing');
    try {
      const text = await transcribe(blob, { verb });
      if (!cleanTranscript(text)) setMsg("Didn't catch that — try again.");
      else { setMsg(null); onTranscript(text); }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Transcription failed.');
    } finally {
      setPhase('idle');
    }
  };

  const recording = phase === 'recording';
  const busy = phase === 'transcribing';
  return (
    <div className="flex flex-col items-center gap-1" data-testid="voice-answer">
      <button
        type="button"
        onClick={onMic}
        disabled={disabled || busy}
        aria-label={recording ? 'Stop recording' : 'Answer by voice'}
        className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-md transition-transform active:scale-95 disabled:opacity-60 ${
          recording ? 'animate-pulse bg-rose-500' : busy ? 'bg-slate-400' : 'bg-indigo-500 hover:bg-indigo-600'
        }`}
      >
        {busy ? <span className="h-5 w-5 animate-spin rounded-full border-4 border-white border-t-transparent" /> : <Mic size={24} />}
      </button>
      <div className="min-h-5 text-center text-xs font-medium text-slate-600" role="status">
        {recording ? 'Listening… tap to stop' : busy ? 'Checking…' : (msg ?? 'Or tap and say it')}
      </div>
    </div>
  );
}
