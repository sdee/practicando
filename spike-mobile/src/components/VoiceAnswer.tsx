'use client';

import { useEffect, useState } from 'react';
import { useRecorder } from '@/hooks/useRecorder';
import { transcribe } from '@/lib/transcribe';

type Phase = 'idle' | 'recording' | 'transcribing' | 'error';

interface VoiceAnswerProps {
  verb: string;
  resetKey: number; // bump to reset to idle (retry)
  disabled?: boolean;
  onTranscript: (text: string) => void;
}

export default function VoiceAnswer({ verb, resetKey, disabled, onTranscript }: VoiceAnswerProps) {
  const rec = useRecorder();
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setPhase('idle');
    setMsg(null);
  }, [resetKey]);

  if (!rec.isSupported) {
    return (
      <div className="text-center text-sm text-rose-600">
        Mic recording isn’t supported in this browser.
      </div>
    );
  }

  const onMic = async () => {
    if (disabled || phase === 'transcribing') return;
    if (phase === 'idle' || phase === 'error') {
      try {
        await rec.start();
        setMsg(null);
        setPhase('recording');
      } catch {
        setPhase('error');
        setMsg('Mic permission denied or unavailable.');
      }
    } else if (phase === 'recording') {
      const blob = await rec.stop();
      if (!blob) {
        setPhase('error');
        setMsg('No audio captured — try again.');
        return;
      }
      setPhase('transcribing');
      try {
        const text = await transcribe(blob, { verb });
        onTranscript(text);
      } catch (e) {
        setPhase('error');
        setMsg(e instanceof Error ? e.message : 'Transcription failed.');
      }
    }
  };

  const recording = phase === 'recording';
  const busy = phase === 'transcribing';

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onMic}
        onPointerDownCapture={(e) => e.stopPropagation()} // don't let the deck's drag hijack the tap
        disabled={disabled || busy}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
        className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60 ${
          recording ? 'animate-pulse bg-rose-500' : busy ? 'bg-slate-400' : 'bg-orange-400 hover:bg-orange-500'
        }`}
      >
        {busy ? (
          <span className="h-6 w-6 animate-spin rounded-full border-4 border-white border-t-transparent" />
        ) : (
          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z" />
            <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V21a1 1 0 102 0v-3.08A7 7 0 0019 11z" />
          </svg>
        )}
      </button>
      <div className="text-center text-sm font-medium text-slate-600">
        {recording
          ? 'Listening… tap to stop'
          : busy
            ? 'Checking…'
            : phase === 'error'
              ? (msg ?? 'Something went wrong')
              : 'Tap and say the conjugation'}
      </div>
    </div>
  );
}
