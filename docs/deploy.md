# Deploying — dev/prod workflow

Copied from Lengua's pattern, with Supabase (Listo's shared project) instead of Firebase.
One Netlify site, two permanent environments:

| | `main` | `dev` |
|---|---|---|
| URL | <https://practicando-pwa.netlify.app> | <https://dev--practicando-pwa.netlify.app> |
| Netlify context | `production` | `branch-deploy` |
| Installed app | **Practicando** | **Practicando Dev** (amber icon + DEV banner) |
| Supabase schema | `practicando` | `practicando_dev` |
| Deploys | only via promotion | every push |

`npm run dev` is always the `dev` identity, so local testing writes to `practicando_dev`
and never touches production progress.

## How the environment is chosen

`withPwaEnv` (`src/lib/pwa-env/next-plugin.ts`) inlines `NEXT_PUBLIC_APP_ENV` from Netlify's
`CONTEXT`. Everything derives from it — nothing is configured per environment:

- **Identity** (name, theme, icons, banner): `src/config/environments.ts`.
- **Database schema**: `SCHEMA` in `src/lib/supabase.ts` — `practicando` for a production
  build, `practicando_dev` otherwise. A production build cannot reach the dev schema or vice
  versa, and sessions are stored under separate keys.
- **Supabase URL + publishable key**: the same in both (one project); browser-safe because
  row-level security limits it to the signed-in user's rows.

## Data: bundled JSON vs Supabase

| Data | Lives in |
|---|---|
| Verb list, conjugations (500 verbs, ~128 KB gzipped) | `public/data/*.json`, committed, shipped with the app |
| Rounds, guesses, metrics | Supabase, per-environment schema |

Conjugations are generated once by `tools/conjugator` (Python `spanishconjugator` + our
`CORRECTIONS`) — **not** at build or runtime. To fix a wrong form: add it to `CORRECTIONS` in
`tools/conjugator/conjugate.py`, run `npm run conjugations`, commit the JSON diff. Requires `uv`.

## One-time setup

1. **Netlify site** `practicando-pwa`, repo connected, production branch `main`; create the
   `dev` branch and push it (branch deploys on).
2. **Supabase:** `npx supabase@latest login`, then `npm run db:setup`. It finds Listo's
   project, applies `supabase/migrations/*` to both schemas, *adds* both schemas to the Data
   API's exposed list and the sign-in redirect URLs (never replacing — Listo and Rocksteady
   share them), sets the two `NEXT_PUBLIC_SUPABASE_*` Netlify variables and writes
   `.env.local`. Safe to rerun; `npm run db:status` changes nothing.
3. **Google sign-in** is Listo's OAuth client; no change needed (Supabase's redirect list
   already allows `https://*--practicando-pwa.netlify.app/**` after step 2).
4. **Bootstrap `main`** once (GitHub only registers `workflow_dispatch` workflows that exist
   on the default branch): `git push origin dev`, wait for the deploy, then
   `PROMOTE=1 git push origin origin/dev:main`.

## Daily flow

1. `npm run dev` / `git push origin dev` → test on **Practicando Dev**.
2. GitHub → Actions → *Promote dev → production* → Run workflow (optionally paste the SHA from
   the DEV banner). It fast-forwards `main` to that exact commit and waits for
   `/api/build` on production to serve it.
3. Rollback: Netlify → Deploys → publish the last good deploy, then `git revert` on `dev`.

`.githooks/pre-push` (activated by `npm install`) blocks accidental direct pushes to `main`.

## Free-plan limits (Supabase, checked Nov 2026 on supabase.com/pricing)

500 MB database per project; 2 active free projects (paused ones don't count); free projects
pause after 1 week of inactivity; 50k MAU; 5 GB egress. Progress is ~200 bytes/guess, so
100 guesses/day ≈ 7 MB/year. Sharing Listo's project means its daily use also keeps this
one awake. If the project ever pauses, restore it in the dashboard before running `db:setup`.
