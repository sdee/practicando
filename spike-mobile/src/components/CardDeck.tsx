'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { CARDS } from '@/data/cards';
import Flashcard from './Flashcard';

const SWIPE_DISTANCE = 80; // px
const SWIPE_VELOCITY = 400; // px/s

const variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? '110%' : '-110%', opacity: 0, scale: 0.96 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? '-110%' : '110%', opacity: 0, scale: 0.96 }),
};

export default function CardDeck() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [mode, setMode] = useState<'type' | 'speak'>('type');
  const [strict, setStrict] = useState(false);

  const total = CARDS.length;
  const card = CARDS[index];
  const answered = Object.keys(results).length;
  const correct = Object.values(results).filter(Boolean).length;

  const paginate = (dir: number) => {
    const next = Math.min(Math.max(index + dir, 0), total - 1);
    if (next === index) return;
    setDirection(dir);
    setIndex(next);
  };

  const record = (id: number, wasCorrect: boolean) =>
    setResults((r) => ({ ...r, [id]: wasCorrect }));

  const restart = () => {
    setDirection(0);
    setIndex(0);
    setResults({});
  };

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) paginate(1);
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) paginate(-1);
  };

  // Desktop: arrow keys navigate (ignored while typing in the input).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && el.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') paginate(1);
      else if (e.key === 'ArrowLeft') paginate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Header */}
      <header className="pad-safe-top flex-shrink-0 px-4 pt-3">
        <div className="mx-auto max-w-[560px] space-y-2 rounded-xl border border-white/60 bg-white/50 px-4 py-2 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-bold leading-tight text-indigo-900">Practicando</div>
              <div className="text-[11px] text-indigo-700">spike · {total} cards</div>
            </div>
            <div className="text-right text-sm font-medium text-slate-700">
              <div>
                {index + 1} / {total}
              </div>
              <div className="text-xs text-slate-500">
                {correct}/{answered} correct
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-white/70 p-0.5 text-sm font-medium">
              {(['type', 'speak'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-md px-3 py-1 transition-colors ${
                    mode === m ? 'bg-indigo-500 text-white' : 'text-slate-600'
                  }`}
                >
                  {m === 'type' ? '⌨ Type' : '🎤 Speak'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStrict((s) => !s)}
                title="Toggle accent strictness. Lenient marks accent-only answers correct with a warning; Strict marks them wrong."
                aria-pressed={strict}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  strict ? 'bg-indigo-500 text-white' : 'bg-white/70 text-slate-600'
                }`}
              >
                Áá {strict ? 'Strict' : 'Lenient'}
              </button>
              <button
                onClick={restart}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Deck */}
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: 'spring', stiffness: 320, damping: 32 }, opacity: { duration: 0.18 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={onDragEnd}
            className="absolute inset-0 flex touch-pan-y items-center justify-center p-4 pad-safe-bottom"
          >
            <div className="h-full max-h-[620px] w-full max-w-[560px]">
              <Flashcard
                card={card}
                questionNumber={index + 1}
                total={total}
                mode={mode}
                strict={strict}
                onResult={(wasCorrect) => record(card.id, wasCorrect)}
                onAdvance={() => paginate(1)}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
