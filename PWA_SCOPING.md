# Practicando → PWA: Scoping & Context

Scoping doc to hand to Opus for a full implementation plan. Captures current
state, the decisions to make, and a ready-to-paste prompt (bottom of file).

---

## 1. Current state (what exists today)

**Two frontends + a Python backend:**

- **`frontend-nextjs/`** — the live app. Next.js **14.2.4** App Router, React 18,
  TypeScript, Tailwind 3.4, `recharts`, `date-fns`. **This is the PWA target.**
- **`frontend/`** — legacy Create-React-App stub (3 files, `App.js`). **Delete/ignore.**
- **`backend/`** — FastAPI + SQLAlchemy + Alembic. SQLite in dev (`dev_app.db`),
  Postgres in prod. Conjugations from the **`spanishconjugator==2.3.9474`** Python
  library, patched by a **`CONJUGATION_CORRECTIONS`** override dict in `utils.py`
  for known library bugs (e.g. `poner`). Verb list =
  `backend/data/verbs-top500-from-tubelex.tsv` (500 verbs, frequency-ranked).

**How the core loop works:**

- Next API routes (`src/app/api/**`) are **thin proxies** to FastAPI at
  `localhost:8000` (also duplicated by `next.config.js` rewrites).
- `createRound(filters)` → server generates N `guesses`, each already carrying its
  `correct_answer`, and returns them.
- **Grading is client-side**: `userAnswer.toLowerCase().trim() === correct_answer.toLowerCase()`.
  The answer key is already in the browser at round start.
- Per-card `submitGuess` is a **fire-and-forget** PUT (UX never blocks on it).
  `completeRound` on finish. `getActiveRound` resumes an in-progress round.
- **Metrics/History** = server-side SQL aggregation over `guesses`/`rounds`:
  coverage (pronoun×tense×mood counts → heatmap), activity time-series
  (day/week/month), and a history list.

**Key implication:** the server's *only* irreplaceable job is **producing the
answer key** (verb list + `spanishconjugator` + overrides). Everything else the
client already does or could do.

**UI facts to preserve / fix:**

- Look: gradient `from-pink-300 via-orange-300 to-indigo-400`; card gradients
  (purple/pink/rose by state); chips pink (pronoun) / yellow (tense) / indigo (mood).
  **Keep this palette.**
- Card is a **fixed `w-[572px] h-[458px]`** — the #1 thing that breaks on mobile.
- **Keyboard-driven**: Enter submits, `n`/`→` next, `Esc` skip, Space/`c` on the
  round-complete screen. No touch gestures today.
- Animations via **`animate.css` from a CDN** (`<link>` in `layout.tsx`) — an
  external dependency that breaks offline; custom keyframes already live in
  `globals.css` and can replace it.
- Nav is a **top bar** (Practice / History / Metrics), not bottom tabs.
- State: a module-global `appState` polled every **100ms** in `layout.tsx` (smell;
  replace with a store or the persistence layer).
- **No PWA scaffolding yet**: no `manifest.ts`, no service worker, no icons.
- Spanish input needs accents (á é í ó ú ñ ü); grading is currently exact-ish, and
  there's no mobile accent-entry affordance.

---

## 2. The pivotal decision: where does the backend go?

FastAPI **cannot run on Netlify** (static + JS/TS/Go serverless functions only; no
always-on Python/ASGI). But **Next.js route handlers do run on Netlify natively** (via
`@netlify/plugin-nextjs` they deploy as serverless functions) — so the cleanest answer
is to **collapse everything into one Next.js app** and delete the separate FastAPI
service. The Next API routes already exist as proxies, so this is incremental: replace
each proxy body with real logic.

Two things are orthogonal and must both be decided:

**(a) Conjugation source — unchanged no matter where the backend lives.** Nothing can
call the Python `spanishconjugator` at runtime from Node. So **precompute the answer
key at build time** using the existing Python pipeline (preserves the
`CONJUGATION_CORRECTIONS` fixes) → ship sharded JSON. *(Alt: a JS conjugation lib or a
TS port — more risk, loses the vetted overrides.)*

**(b) Where persistence + server logic live:**

- **A. Client-side core (recommended).** Client reads the precomputed JSON, generates
  rounds, grades, and stores progress in **IndexedDB**. Next.js route handlers exist
  only for what truly needs a server (Stage-4 voice key; optional cloud sync). →
  Offline, instant, one repo/one deploy.
- **A′. Server-ful in Next.js (simplest to reason about, not offline).** Rounds /
  guesses / metrics live in Next.js route handlers backed by a serverless Postgres
  (Neon / Supabase / Netlify DB). Metrics port ~1:1 (still SQL). → One repo/one deploy,
  conventional, but needs network + a hosted DB.
- **B. Keep FastAPI, host separately** (Render/Railway/Fly). → Two hosts, two
  languages; only worth it to avoid rewriting Python. Not recommended.

**Recommendation: one Next.js app on Netlify for the serving path.** Retire FastAPI
from deployment but **keep it as the build-time conjugation generator + optional local
dev backend**; delete the CRA stub. Use **A** — client-side core off the precomputed
dataset — to keep offline + instant feedback, with route handlers owning only voice
(Stage 4) and, if wanted, cross-device sync. Pick **A′** instead only if you'd rather
not maintain client-side round/metric logic and don't need offline.

### Precompute feasibility

500 verbs × 8 tenses × 4 moods × 9 pronouns = **~144k** combos max, minus invalid
ones (imperative pronouns, subjunctive el→usted normalization already in `utils.py`).
Short strings → a few MB raw, well under ~1 MB gzipped, and **shardable by verb set**
(ship top10/20/50, lazy-load top100–500). A small script runs the *existing* Python
pipeline (so `CONJUGATION_CORRECTIONS` fixes are preserved) and emits JSON the client
consumes. This replaces `createRound`/`getVerbSet`/`getVerbConjugations`.

### Keeping Python — its role vs the Next.js surface

Yes, keep Python — just **not in the mobile serving path** (it can't live on Netlify).
Two legitimate roles:

1. **Build-time conjugation authority (the reason to keep it).** A script runs the
   existing `spanishconjugator` + `CONJUGATION_CORRECTIONS` pipeline to emit the
   precomputed dataset the PWA ships.
2. **Local dev / admin backend (optional).** The current FastAPI app can stay for your
   own testing, DB validation, and data generation — **the mobile PWA never calls it.**

The **Next.js API surface is a deliberate subset** of FastAPI's ~12 endpoints, because
the heavy lifting is precomputed upstream — **no Next.js route ever needs Python**:

- **A (client-side core):** surface ≈ **0** for the loop; a route handler only for the
  Stage-4 voice key.
- **A′ (server-ful):** ~4–5 thin routes (create round, record guess, metrics, history,
  verb conjugations), all reading precomputed data.

**Trap to avoid:** letting the *mobile* app depend on the Python backend at runtime —
that re-introduces Option B (host Python, network-required, no longer "local").

**To share progress** across a desktop (Python) build **and** the mobile PWA: use A′
with the Next.js routes on a hosted Postgres — optionally the *same* DB your local
FastAPI uses. Python still isn't deployed; only the DB is shared. (Cost: one schema in
two ORMs.)

---

## 3. Mobile-friendly UI decisions

- **Responsive card**: drop fixed px; use fluid width `min(92vw, 520px)` and
  `100dvh`-based height minus safe areas + bottom tab. Fit more by compacting the
  header/title and chips.
- **Settings location** (you asked): **bottom sheet** launched from a gear icon in a
  compact top bar, plus the existing "Change it up" on the round-complete screen.
  Thumb-reachable, native feel, doesn't consume vertical space while playing. Keep the
  current grouping (pronouns / tenses / moods / verb set / count / retry). *(Alt: a
  dedicated `/settings` route — heavier, loses context.)*
- **Portrait vs landscape** (you asked): portrait = vertical stack (prompt top, input
  below). Landscape / short-height = two-column (prompt left, input+feedback right) so
  the on-screen keyboard doesn't bury the card. Drive with `@media (orientation)` +
  height breakpoints.
- **Swipe** (you asked): swipe left/right to advance after answering; decide whether a
  pre-answer swipe = skip or nothing (recommend: right-swipe = skip, matching Esc).
  Keep keyboard shortcuts for desktop. **Gesture lib decision** — `framer-motion`
  (drag + spring, flexible) vs `embla-carousel` (true carousel) vs `react-swipeable`
  (light) vs hand-rolled pointer events. *Recommend framer-motion.*
- **Keep the look**: same gradient, chips, card states, bounce/shake feedback — but
  **self-host the animations** (already in `globals.css`) and drop the animate.css CDN
  for offline.
- **Accent entry**: add an accent bar above the input (or long-press), and/or
  normalize accents in grading. Voice (Stage 4) sidesteps typing but the typed path
  still needs this.

---

## 4. PWA scaffolding (per your Next.js App Router defaults)

- `src/app/manifest.ts` returning `MetadataRoute.Manifest`; `start_url: '/practice'`,
  `display: 'standalone'`, `theme_color`/`background_color` matched to the pink/indigo
  shell (no launch flash).
- Icons 192 + 512 PNG in `public/`, generated from one 512 SVG via
  `scripts/generate-icons.mjs` (sharp); also set `metadata.icons.apple` in `layout.tsx`
  (iOS ignores manifest icons).
- Separate `export const viewport` with `viewportFit: 'cover'`; pad fixed bars with
  `env(safe-area-inset-*)`.
- **Service worker**: Next 14 App Router has none built in → decision: **Serwist**
  (`@serwist/next`) vs `next-pwa` (less maintained) vs hand-rolled. Precache app shell
  + conjugation dataset. *Recommend Serwist.*
- Move nav to a **fixed bottom tab bar** (Practice / History / Metrics), `usePathname()`
  active state, `backdrop-blur`, lucide-react icons.

---

## 5. Persistence (Stage 3)

- **Local vs cloud.** Recommend **IndexedDB, local-only, no login** (offline-first,
  zero friction). Model rounds/guesses to mirror today's shape (`idb` or `Dexie`).
  Reimplement the two aggregations (coverage, activity) in JS — they're simple
  group-bys. *(Cloud sync via Firebase auth is a noted later option if you want
  cross-device; you normally use Firebase.)*
- **Migration**: none needed — the dev DB is ~empty (20 KB). Greenfield local storage.
- Replace the module-global `appState` + 100 ms polling with the store / persistence
  layer.

---

## 6. Voice input (Stage 4) — the exciting one

Goal: speak the answer → check **(1) conjugation correctness** and **(2) pronunciation
quality + how to improve** → if correct, flash "correct" and **auto-advance**.

**Decision — Stage 4 v1:** start with **Whisper** (on-device or hosted) + the
**"I heard: X" confirm/retry** loop, and **defer pronunciation scoring (Level 2)**.
Rationale: validate the speak-and-auto-advance UX cheaply/offline before paying for a
specialized service. Azure/Speechace's headline metrics — *fluency, completeness,
prosody* — are **passage-level** and have nothing to score on a single conjugated word,
so they're a poor fit here. **Azure Pronunciation Assessment is earmarked for a separate
future app (reading longer passages aloud)**, where those metrics apply — out of scope
for this plan.

**Options analysis (for the eventual Level-2 upgrade):**

- **Transcription (gives you TEXT → Level 1):**
  - *On-device Web Speech API* — free, low latency, but iOS/Safari support is flaky and
    Spanish quality varies.
  - *Whisper* — OpenAI's STT, either the **hosted API** (`whisper-1` / newer
    `gpt-4o-transcribe`) or **on-device** (whisper.cpp / `transformers.js` in-browser via
    WebGPU). Strong, cheap, can run offline → ideal **fast correctness gate**.
    **Caveat:** transcription only — it does **not** score pronunciation, and it
    *normalizes toward real words*, which can hide a mispronunciation (great for Level 1,
    useless for Level 2 alone).
  - *Other cloud STT* (Deepgram, Google) — similar: text + some word confidence.
- **Pronunciation scoring (needs the AUDIO, not just text → Level 2):**
  - ***Microsoft Azure* AI Speech — Pronunciation Assessment** ("Azure" = MS Azure).
    Purpose-built: phoneme-level accuracy / fluency / completeness / prosody scores.
    **It also transcribes, so one Azure call can cover BOTH levels.** Best pronunciation
    science; needs a key + route handler + per-call cost/latency.
  - *Audio-native LLM* — send raw audio + the target word, ask for a critique. Must be a
    model that accepts **audio input**: OpenAI **GPT-4o audio** or Google **Gemini**.
    ⚠️ **Anthropic Claude cannot** — its inputs are text/image/PDF only (confirmed via the
    claude-api skill; audio is an unsupported content type). Claude can only phrase
    coaching from a *transcript* or another engine's phoneme scores, never judge the audio.
    Audio-native LLMs give flexible coaching but are less calibrated than Azure/Speechace.
  - *Speechace* — specialized pronunciation-scoring API (phoneme/IPA/fluency), purpose-built
    for language learning; the closest Azure alternative, lighter signup than Azure.
- **Two-level check:** Level 1 (right word) = compare transcript to expected
  conjugation (fuzzy, since STT mis-hears short/accented words). Level 2 (pronunciation
  + tips) = **specialized API (Azure) vs LLM judge vs hybrid** (Azure score → LLM
  phrases the coaching; note one Azure call returns transcript **and** scores). Key
  point: transcript-only pronunciation feedback is unreliable because STT already
  normalized the error away — real scoring needs the **audio**.
- **Level-1 accuracy — Whisper is a first-pass gate, not a silent judge.** The exact
  distinctions conjugation drills test are STT's weak spots, worsened by single-word
  (no-context) input: final **-s/-n** (tú `hablas` vs él `habla`, ellos `hablan` vs él
  `habla`), **stress/accent-only** pairs (`hablo`/`habló`, `hable`/`hablé`), and
  **homophones** (`tuvo`/`tubo`, `haya`/`halla`, `hecho`/`echo`, `vaya`/`valla`).
  On-device `tiny`/`base` are notably worse on endings than cloud `large-v3`. Make it
  adequate with: (1) **accent-normalized + homophone/minimal-pair-aware** comparison
  against the target — not raw `==` — and a deliberate call on whether to enforce
  stress-only accents; (2) an **"I heard: X" confirm + one-tap retry** so a misread is
  recoverable; (3) **bias the decode** with the infinitive/pronoun/tense (`initial_prompt`);
  (4) optional **on-device gate → cloud (large-v3/Azure) escalation** only when the fast
  pass disagrees with the expected answer.
- **Three viable architectures:** (1) **Azure only** — one call, both levels;
  (2) **on-device Whisper only** — cheapest/offline fast gate, weak Level 2;
  (3) **hybrid** — on-device Whisper gate + async Azure scoring (best UX↔capability
  balance, most moving parts).
- **Architecture:** browser mic (`getUserMedia`/`MediaRecorder`) → a **Next.js route
  handler** (runs as a Netlify serverless function) to hold the API key and call
  STT/assessment (keys can't ship client-side). This is the one server dependency the
  core app otherwise avoids.
- **Cost & latency:** must be computed from **current** provider pricing — do **not**
  guess. Shape to validate: an answer is ~1–2 s of audio; per-answer cost is tiny
  (fractions of a cent) but **latency is the real UX risk** — a cloud round-trip
  (~0.5–2 s) fights the "instant flash + auto-advance" feel. Consider on-device STT as
  a fast correctness gate + async cloud pronunciation scoring, or a brief
  "listening… / checking…" state.
- **UX/permissions:** mic-permission prompt, iOS **standalone-PWA** mic quirks,
  push-to-talk vs auto-listen, no-speech timeout, noisy environments, typed fallback,
  privacy disclosure (voice leaves the device), your region (Peru) → provider latency.
- **Result matrix** the UI must handle: right word + good pron / right word + poor pron
  / wrong word / unintelligible.

---

## 7. Staged plan (matches your priorities)

### Spikes first (de-risk the two scariest parts, zero backend)

Do these **before** the full stages. Both run against a **hardcoded ~20-card JSON** —
no backend, no precompute, no D1/D2 decision needed. Each card:
`{ verb, pronoun, tense, mood: 'indicative', answer }`.

- **Fixed dataset (~20 cards):** common verbs — `caminar`, `hablar`, `comer`, `vivir`,
  plus a couple irregulars (`tener`, `ser`) — across `yo / tú / él` in **present** and
  **preterite** ("past"). Hand-written, checked into the repo.

- **Spike A — Mobile UX + swipe (do first).** Prove the *feel* on a phone: fluid card
  (portrait stack + landscape two-column, `100dvh` + safe-area), **swipe to advance**
  (framer-motion drag), type-or-reveal answer with correct/incorrect states + bounce/
  shake, palette preserved, minimal PWA shell (manifest, 192/512 icons, standalone,
  `viewportFit: cover`) so it's installable. **Deliberately omit:** real conjugation
  source, settings, persistence, metrics, voice. **Done = install to home screen, swipe
  through the 20 cards, answer/reveal, in portrait and landscape.**

- **Spike B — Whisper test (follow-up).** Same 20 cards + mic (`getUserMedia`/
  `MediaRecorder`) → Whisper (on-device `transformers.js`, or hosted) → accent- &
  homophone-normalized compare vs the card's `answer` → **"I heard: X" confirm/retry** →
  auto-advance on correct. **Goal: measure the real recognize rate on short `-ar`
  present/preterite forms and judge whether the confirm/retry UX feels good.** No
  pronunciation scoring.

### Full stages (after the spikes)

1. **Stage 1 — Basic interactions, mobile-first.** PWA scaffolding (manifest, icons,
   viewport, SW, bottom tabs). Responsive card (portrait + landscape). Swipe. Bottom-
   sheet settings. Preserve palette; drop animate.css CDN. Resolve backend Option A:
   precompute conjugation dataset, make core loop client-side (create round, change
   settings, play a full round). **Goal: change settings + play a round, offline, on a
   phone.**
2. **Stage 2 — Polish interactions.** Accent entry, animations/feedback parity,
   keyboard (desktop) + gesture (mobile) parity, edge cases (empty filters, resume).
3. **Stage 3 — Persist progress.** IndexedDB rounds/guesses; port coverage + activity
   metrics and history to client; resume active round; replace `appState` polling.
4. **Stage 4 — Speak your answer.** Mic capture → STT + two-level check → auto-advance;
   Next.js route handler for keys; evaluate STT/pronunciation options with **current** cost +
   latency estimates.

---

## 8. Decision log (recommendation → alternatives)

| # | Decision | Recommendation | Alternatives |
|---|---|---|---|
| D1 | Backend / hosting | **Next.js serving path on Netlify**; retire FastAPI to build-time/local only; client-side core off precomputed data | A′: server-ful Next.js + hosted DB; B: host FastAPI separately |
| D2 | Conjugation source | **Precompute via existing Python pipeline** (keeps overrides) | JS conjugation lib; keep server call |
| D3 | Settings UI | **Bottom sheet** from top-bar gear + round-complete | `/settings` route; inline accordion |
| D4 | Orientation | **Portrait stack / landscape two-column** | Portrait-lock |
| D5 | Swipe / gesture lib | **framer-motion drag** | embla; react-swipeable; hand-rolled |
| D6 | Service worker | **Serwist (`@serwist/next`)** | next-pwa; hand-rolled |
| D7 | Persistence | **IndexedDB local-only, no login** | Firebase cloud sync; local-now-cloud-later |
| D8 | Animations | **Self-host keyframes**, drop CDN | keep CDN (breaks offline) |
| D9 | Accents | **Accent bar + normalize in grading** | rely on voice; ignore |
| D10 | Voice STT (this app) | **Whisper-first v1** + "I heard X" confirm/retry; defer Level-2 scoring | Azure/Speechace later (better fit for a separate read-aloud-passage app); hybrid |
| D11 | Legacy `frontend/` | **Delete** | keep |

---

## 9. Prompt for Opus (paste below)

> **Task:** Produce a detailed, phased implementation plan to convert *Practicando*
> (a Spanish verb-conjugation practice app) into an installable, mobile-first,
> offline-capable **PWA**, deployed on **Netlify**.
>
> **Repo context (verified):**
> - Live frontend: `frontend-nextjs/` — Next.js 14.2.4 App Router, React 18, TS,
>   Tailwind 3.4, recharts, date-fns. **No PWA scaffolding exists** (no manifest, SW,
>   or icons). Legacy `frontend/` is a dead CRA stub — plan to delete it.
> - Backend: FastAPI + SQLAlchemy + Alembic (SQLite dev / Postgres prod). Conjugations
>   come from the Python `spanishconjugator` lib, **patched by a `CONJUGATION_CORRECTIONS`
>   override dict** in `backend/utils.py`. Verb list =
>   `backend/data/verbs-top500-from-tubelex.tsv` (500 freq-ranked verbs).
> - The Next API routes are thin proxies to FastAPI. **Grading is already client-side**
>   (the `correct_answer` ships to the browser at round start). The server's only
>   irreplaceable job is generating the answer key.
> - **FastAPI cannot run on Netlify** (static + JS/TS/Go functions only), but **Next.js
>   route handlers deploy on Netlify as serverless functions** — so consolidating the
>   backend into Next.js is viable; a separate Python service is not.
> - UI to preserve: gradient `pink-300 → orange-300 → indigo-400`; pink/yellow/indigo
>   chips; per-state card gradients; bounce/shake feedback (custom keyframes already in
>   `globals.css`; animate.css is loaded from a CDN and must go for offline). Card is a
>   fixed `572×458 px` and keyboard-driven today.
>
> **Constraints / defaults:** Netlify hosting; Next.js App Router PWA conventions
> (`manifest.ts`, separate `viewport` with `viewportFit:'cover'`, safe-area insets,
> 192/512 icons from one SVG, fixed bottom tab bar); keep the existing color palette
> and feedback animations; offline-first.
>
> **Recommended architecture to plan around (justify or override):** consolidate the
> **serving path into a single Next.js app deployed on Netlify**; retire FastAPI from
> deployment but **keep it as the build-time conjugation generator + an optional local
> dev backend** (Next.js route handlers run on Netlify as serverless functions; the
> existing API routes already proxy to FastAPI, so replace their bodies with real logic).
> Keep the Next.js API surface a **deliberate subset** of the old FastAPI routes — the
> mobile app must never call Python at runtime. Make the
> **core round loop client-side** off a precomputed, shardable conjugation dataset
> generated at build time by the *existing Python pipeline* (preserving
> `CONJUGATION_CORRECTIONS`); persist progress in **IndexedDB**; use **Next.js route
> handlers** only where a server is required — the Stage-4 voice API key and (optional)
> cloud progress sync. Also evaluate the simpler **server-ful** variant (rounds /
> guesses / metrics in Next.js route handlers backed by serverless Postgres — no
> offline) and recommend one.
>
> **Start with two spikes (before the full stages), each against a hardcoded ~20-card
> JSON — no backend, no precompute:** the fixed set is common verbs (`caminar`, `hablar`,
> `comer`, `vivir`, `tener`, `ser`) across `yo/tú/él` in present + preterite, each card
> `{verb, pronoun, tense, mood:'indicative', answer}`. **Spike A (do first): mobile UX +
> swipe** — fluid card (portrait + landscape, dvh + safe-area), framer-motion swipe-to-
> advance, type-or-reveal with correct/incorrect + bounce/shake, palette preserved,
> minimal installable PWA shell; omit real data/settings/persistence/voice; done = install
> to home screen and swipe/answer through 20 cards in both orientations. **Spike B: Whisper
> test** — same cards + mic → Whisper (on-device `transformers.js` or hosted) → accent/
> homophone-normalized compare → "I heard X" confirm/retry → auto-advance; goal = measure
> the recognize rate on short `-ar` present/preterite forms and validate the confirm/retry
> UX; no pronunciation scoring. Treat the spikes as throwaway/foldable learning, then:
>
> **Deliver a phased plan for these 4 stages, in order:**
> 1. **Basic interactions, mobile-first** — PWA scaffolding; responsive card (portrait
>    stack + landscape two-column); swipe-to-advance; **bottom-sheet settings**; drop the
>    animate.css CDN; implement the precomputed client-side round loop. **Definition of
>    done: on a phone, offline, a user can change settings and play a full round.**
> 2. **Polish** — Spanish accent entry, keyboard(desktop)+gesture(mobile) parity,
>    animation/feedback parity, edge cases (empty filters, resume mid-round).
> 3. **Persist progress** — IndexedDB rounds/guesses; port coverage + activity metrics
>    and history to the client; replace the module-global `appState` + 100 ms polling.
> 4. **Speak your answer (new feature)** — mic capture → STT → **two-level check:
>    (1) is the conjugation correct, (2) could pronunciation be improved and how**; on
>    correct, flash "correct" and **auto-advance**. For **Level 1**, make the correctness
>    check **accent-normalized and homophone/minimal-pair-aware** (Spanish forms differ by
>    final -s/-n and stress-only accents that STT mishears) with an "I heard X"
>    confirm-and-retry — not a raw string compare; consider an on-device gate that escalates
>    to a cloud model on mismatch. Evaluate STT/pronunciation options —
>    **Whisper** (OpenAI, hosted API *or* on-device via `transformers.js`) for
>    transcription/Level 1; **Microsoft Azure AI Speech Pronunciation Assessment** for
>    Level 2 (it also transcribes, so one call can do both); on-device Web Speech;
>    Deepgram/Google; Speechace (specialized pronunciation API); audio-native LLMs
>    (OpenAI GPT-4o audio or Gemini — NOT Claude, which accepts text/image/PDF only, so
>    Claude is limited to phrasing coaching from a transcript/scores) — and compare the architectures
>    (Azure-only / on-device-Whisper-only / hybrid). **Build v1 on Whisper + the "I heard X"
>    confirm/retry and defer Level-2 pronunciation scoring** (Azure/Speechace's fluency /
>    completeness / prosody are passage-level and don't fit single-word answers — earmark
>    them for a separate read-aloud-passage app, out of scope here). Keep the API key in a
>    Next.js route handler. Still **estimate per-answer cost and end-to-end latency for the
>    options using CURRENT provider pricing you look up — do not rely on memory** — so the
>    Level-2 upgrade is costed. If any option involves Anthropic models, pull current model
>    IDs + pricing from authoritative sources.
>
> **For each stage:** concrete task breakdown, files to add/change/delete, the
> decisions it resolves (with rationale), risks, and a test/verification step. Resolve
> the open decisions in the decision log (D1–D11) explicitly. Flag anything that needs
> my input.
