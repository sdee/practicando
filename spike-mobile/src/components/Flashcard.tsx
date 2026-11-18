'use client';

import { useEffect, useState } from 'react';
import type { Card } from '@/data/cards';
import { gradeAnswer } from '@/data/cards';
import VoiceAnswer from './VoiceAnswer';

type Result = 'idle' | 'correct' | 'incorrect' | 'revealed';
export type Mode = 'type' | 'speak';

interface FlashcardProps {
  card: Card;
  questionNumber: number;
  total: number;
  mode: Mode;
  strict: boolean;
  onResult: (correct: boolean) => void;
  onAdvance: () => void; // speak mode auto-advances on correct
}

const CARD_BG: Record<Result, string> = {
  idle: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
  revealed: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
  correct: 'linear-gradient(135deg, #f9e2e2 0%, #f7c6c6 100%)',
  incorrect: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
};

const TENSE_LABEL: Record<string, string> = {
  present: 'Present',
  preterite: 'Preterite',
};

export default function Flashcard({
  card,
  questionNumber,
  total,
  mode,
  strict,
  onResult,
  onAdvance,
}: FlashcardProps) {
  const [value, setValue] = useState('');
  const [heard, setHeard] = useState('');
  const [state, setState] = useState<Result>('idle');
  const [anim, setAnim] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [voiceResetKey, setVoiceResetKey] = useState(0);

  const answered = state !== 'idle';

  // Speak mode: flash "correct" then auto-advance. Give extra time to read an
  // accent warning before moving on.
  useEffect(() => {
    if (mode !== 'speak' || state !== 'correct') return;
    const t = setTimeout(onAdvance, warning ? 2400 : 1000);
    return () => clearTimeout(t);
  }, [mode, state, warning, onAdvance]);

  const grade = (attempt: string) => {
    const { correct, accentIssue } = gradeAnswer(attempt, card.answer, strict);
    setState(correct ? 'correct' : 'incorrect');
    setAnim(correct ? 'animate-triple-bounce' : 'animate-enhanced-shake');
    setWarning(
      accentIssue
        ? correct
          ? `Right — but mind the accent: “${card.answer}”`
          : `Accent required: “${card.answer}”`
        : null
    );
    onResult(correct);
  };

  const submitTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || answered) return;
    grade(value);
  };

  const handleTranscript = (text: string) => {
    setHeard(text);
    setValue(text);
    grade(text);
  };

  const retrySpeak = () => {
    setState('idle');
    setAnim('');
    setValue('');
    setHeard('');
    setWarning(null);
    setVoiceResetKey((k) => k + 1);
  };

  const reveal = () => {
    if (answered) return;
    setState('revealed');
  };

  const borderClass =
    state === 'correct'
      ? 'border-emerald-300'
      : state === 'incorrect'
        ? 'border-rose-300'
        : 'border-slate-300';

  return (
    <div
      className={`flex h-full w-full flex-col justify-between gap-4 rounded-2xl border-2 ${borderClass} p-6 shadow-lg landscape:flex-row landscape:items-stretch landscape:gap-6 ${anim}`}
      style={{ background: CARD_BG[state] }}
    >
      {/* Prompt */}
      <div className="flex flex-col items-center justify-center gap-3 text-center landscape:flex-1">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {questionNumber} / {total}
        </div>
        <div className="text-4xl font-bold text-slate-800">{card.verb}</div>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-pink-500 px-3 py-1 text-sm font-medium text-white">
            {card.pronoun}
          </span>
          <span className="rounded-full bg-yellow-500 px-3 py-1 text-sm font-medium text-white">
            {TENSE_LABEL[card.tense]}
          </span>
          <span className="rounded-full bg-indigo-900 px-3 py-1 text-sm font-medium text-white">
            {card.mood}
          </span>
        </div>
      </div>

      {/* Answer */}
      <div className="flex flex-col justify-center landscape:flex-1">
        {!answered ? (
          mode === 'type' ? (
            <form onSubmit={submitTyped} className="space-y-3">
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onPointerDownCapture={(e) => e.stopPropagation()}
                placeholder="Escribe la conjugación…"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-center text-lg font-medium focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
              <button
                type="submit"
                disabled={!value.trim()}
                className="w-full rounded-xl bg-orange-400 py-3 text-lg font-semibold text-white transition-colors hover:bg-orange-500 disabled:bg-orange-200"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={reveal}
                onPointerDownCapture={(e) => e.stopPropagation()}
                className="w-full rounded-xl bg-slate-300 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-400"
              >
                Show answer
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <VoiceAnswer verb={card.verb} resetKey={voiceResetKey} onTranscript={handleTranscript} />
              <button
                type="button"
                onClick={reveal}
                onPointerDownCapture={(e) => e.stopPropagation()}
                className="w-full rounded-xl bg-slate-300 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-400"
              >
                Show answer
              </button>
            </div>
          )
        ) : (
          <div className="space-y-2 text-center">
            <div
              className={`text-xl font-bold ${
                state === 'correct'
                  ? 'text-emerald-600'
                  : state === 'incorrect'
                    ? 'text-rose-600'
                    : 'text-slate-600'
              }`}
            >
              {state === 'correct' ? '¡Correcto!' : state === 'incorrect' ? 'Incorrecto' : 'Answer'}
            </div>
            {(value.trim() || heard) && (
              <div className="rounded-xl bg-white px-4 py-2 text-lg">
                <span className="text-base text-slate-600">
                  {mode === 'speak' ? 'I heard: ' : 'You said: '}
                </span>
                <span
                  className={`font-semibold ${state === 'correct' ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {(heard || value).trim() || '—'}
                </span>
              </div>
            )}
            {warning && <div className="text-sm font-medium text-amber-600">⚠️ {warning}</div>}
            {state !== 'correct' && !warning && (
              <div className="rounded-xl bg-white px-4 py-2 text-lg">
                <span className="text-base text-slate-600">Answer: </span>
                <span className="font-semibold text-emerald-600">{card.answer}</span>
              </div>
            )}
            {mode === 'speak' && state === 'correct' ? (
              <div className="pt-1 text-xs text-slate-500">Nice — advancing…</div>
            ) : mode === 'speak' ? (
              <button
                type="button"
                onClick={retrySpeak}
                onPointerDownCapture={(e) => e.stopPropagation()}
                className="mt-1 w-full rounded-xl bg-orange-400 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
              >
                🎤 Try again · or swipe for next
              </button>
            ) : (
              <div className="pt-1 text-xs text-slate-500">Swipe or press → for next</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
