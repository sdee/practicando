'use client';

import { useCallback, useEffect, useRef } from 'react';

// Chrome/Android/desktop → webm/opus; iOS Safari → mp4/aac. Whisper accepts all of these.
function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'].find((c) => {
    try { return MediaRecorder.isTypeSupported(c); } catch { return false; }
  });
}

const IDLE_RELEASE_MS = 3 * 60 * 1000;

const live = (s: MediaStream | null): s is MediaStream =>
  !!s && s.getAudioTracks().length > 0 && s.getAudioTracks().every((t) => t.readyState === 'live' && !t.muted && t.enabled);

// Module-level on purpose: the card's mic button unmounts whenever a card flips to its answer
// view, so a stream owned by the component would be dropped (and iOS would re-prompt) every card.
let heldStream: MediaStream | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function releaseStream() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  heldStream?.getTracks().forEach((t) => t.stop());
  heldStream = null;
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', releaseStream);

/**
 * One mic stream is held between takes: iOS Home Screen apps don't remember the permission, so
 * reopening it per recording would re-prompt every card. It's reused only while every track is
 * live/unmuted (iOS mutes on interruptions — a muted track records silence), and released after
 * ~3 min idle and on pagehide.
 */
export function useRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined';

  // Leaving mid-take discards it; the stream itself stays held for the next card.
  useEffect(() => () => {
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') { r.onstop = null; r.stop(); }
  }, []);

  /** Throws on permission denial / no mic — the caller shows the message. */
  const start = useCallback(async () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    if (!live(heldStream)) {
      releaseStream();
      heldStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    const mime = pickMime();
    const recorder = new MediaRecorder(heldStream!, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.start();
    recorderRef.current = recorder;
  }, []);

  const stop = useCallback((): Promise<Blob | null> =>
    new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) return resolve(null);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        recorderRef.current = null;
        idleTimer = setTimeout(releaseStream, IDLE_RELEASE_MS); // keep the stream for the next card
        resolve(blob.size > 0 ? blob : null);
      };
      recorder.stop();
    }), []);

  return { isSupported, start, stop };
}
