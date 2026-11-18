# Practicando — Mobile PWA Spike

Throwaway spike (Spike A in [`../PWA_SCOPING.md`](../PWA_SCOPING.md)) to prove the
**mobile swipe UX** for the conjugation flashcards, against a **hardcoded 20-card set** —
no backend, no precompute, no conjugation engine.

## What it proves
- Fluid, responsive flashcard (portrait stack / landscape two-column, `100dvh` + safe-area).
- **Swipe** left/right to move between cards (framer-motion drag + spring).
- Type-or-reveal answer with correct/incorrect states and the original bounce/shake feedback.
- Installable PWA shell (manifest, 192/512 icons, `standalone`, `viewport-fit: cover`) + a
  minimal offline service worker.

## Deliberately omitted
Real conjugation source, settings, persistence, and metrics — those come later.

## Accent strictness (header toggle)
Three-way grading (`gradeAnswer` in `src/data/cards.ts`): exact → correct; matches only
when accents are dropped → an **accent issue**; otherwise wrong.
- **Lenient** (default): accent-only answers are marked **correct with a ⚠️ warning**
  showing the written form. In Speak mode the auto-advance waits a beat longer so the
  note is readable.
- **Strict**: accent-only answers are marked **incorrect** ("accent required").

## Spike B — Whisper (voice)
Toggle **🎤 Speak** in the header: tap the mic, say the conjugation, and the audio is
sent to a Next.js route handler (`/api/transcribe`) that calls **OpenAI Whisper**
server-side. The transcript is compared (accent-insensitive) to the card's answer; on a
match the card flashes and **auto-advances**, otherwise it shows "I heard: X" + the answer
with a **Try again**. The transcribe boundary (`src/lib/transcribe.ts`) is swappable for
on-device later.

**Setup — needs an OpenAI API key:**
- Local: `cp .env.example .env.local` and set `OPENAI_API_KEY=...`, then `npm run dev`.
- Netlify: add `OPENAI_API_KEY` under Site configuration → Environment variables, then
  redeploy. (The key stays server-side in the function; it is never shipped to the client.)

iOS note: mic capture needs HTTPS (Netlify ✅) and a user tap; test permission early in an
installed (standalone) PWA.

## Run
```bash
cd spike-mobile
npm install
npm run icons   # generate PWA PNG icons (uses sharp)
npm run dev     # http://localhost:3000
```

### Try it on a phone
Same Wi‑Fi: `npm run dev -- -H 0.0.0.0`, then open `http://<your-mac-ip>:3000` on the phone.
For real install/offline testing (service worker needs a production build):
```bash
npm run build && npm run start -- -H 0.0.0.0
```
Then **Add to Home Screen** (iOS Safari) or install (Chrome). Note: iOS requires HTTPS or
`localhost` for the service worker — over LAN HTTP the app still runs, but SW/offline may
be disabled.

## Structure
- `src/data/cards.ts` — the fixed 20-card dataset + lenient normalize().
- `src/components/CardDeck.tsx` — swipe/navigation + score.
- `src/components/Flashcard.tsx` — responsive card, answer/reveal, feedback states.
- `src/app/manifest.ts`, `layout.tsx`, `public/sw.js` — PWA shell.
