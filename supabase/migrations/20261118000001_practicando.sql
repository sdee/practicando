-- Practicando progress. Applied once per environment schema by scripts/setup-sync.mjs, which
-- replaces {{schema}} with `practicando` (production) or `practicando_dev` (dev + local).
-- Both live inside Listo's Supabase project (free plan: 2 active projects), so nothing of
-- Listo's or Rocksteady's is touched. Verb data is NOT here — it ships as bundled JSON.

create schema if not exists {{schema}};

create table if not exists {{schema}}.rounds (
  id            uuid primary key,                           -- client-generated
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,                                -- null = still in progress
  filters       jsonb not null,                             -- {pronouns, tenses, moods, verb_class}
  num_questions smallint not null,
  num_correct   smallint not null default 0
);
create index if not exists rounds_user_ended on {{schema}}.rounds (user_id, ended_at desc);
create index if not exists rounds_user_active on {{schema}}.rounds (user_id, started_at desc) where ended_at is null;

create table if not exists {{schema}}.guesses (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  round_id       uuid not null references {{schema}}.rounds (id) on delete cascade,
  position       smallint not null,                         -- order within the round
  verb           text not null,
  pronoun        text not null,
  tense          text not null,
  mood           text not null,
  correct_answer text not null,
  user_answer    text,                                      -- null = not answered yet (or skipped)
  is_correct     boolean,
  skipped        boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists guesses_user_created on {{schema}}.guesses (user_id, created_at);
create index if not exists guesses_round on {{schema}}.guesses (round_id, position);

-- Only your own rows, ever.
alter table {{schema}}.rounds enable row level security;
alter table {{schema}}.guesses enable row level security;
drop policy if exists "own rows" on {{schema}}.rounds;
create policy "own rows" on {{schema}}.rounds for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own rows" on {{schema}}.guesses;
create policy "own rows" on {{schema}}.guesses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant usage on schema {{schema}} to authenticated;
grant select, insert, update, delete on {{schema}}.rounds, {{schema}}.guesses to authenticated;
revoke all on {{schema}}.rounds, {{schema}}.guesses from anon;

-- Metrics: aggregated in SQL (PostgREST returns at most 1000 rows, so never aggregate client-side).
-- security invoker (the default) keeps row-level security in force.
create or replace function {{schema}}.coverage(p_mood text default null)
returns table (pronoun text, tense text, mood text, question_count bigint)
language sql stable set search_path = '' as $$
  select g.pronoun, g.tense, g.mood, count(*)
  from {{schema}}.guesses g
  where g.user_answer is not null and (p_mood is null or g.mood = p_mood)
  group by g.pronoun, g.tense, g.mood
  order by count(*) desc;
$$;

-- Count per time bucket, in the caller's time zone (a day is the user's day, not UTC's).
-- p_metric: 'questions' (answered guesses) | 'rounds' (completed rounds); p_bucket: 'day' | 'week'.
create or replace function {{schema}}.activity(p_metric text, p_bucket text, p_from timestamptz, p_to timestamptz, p_tz text)
returns table (bucket date, value bigint)
language sql stable set search_path = '' as $$
  select date_trunc(p_bucket, ts at time zone p_tz)::date, count(*)
  from (
    select g.created_at as ts from {{schema}}.guesses g
      where p_metric = 'questions' and g.user_answer is not null
    union all
    select r.ended_at from {{schema}}.rounds r
      where p_metric = 'rounds' and r.ended_at is not null
  ) x
  where ts >= p_from and ts < p_to
  group by 1 order by 1;
$$;
grant execute on function {{schema}}.coverage(text), {{schema}}.activity(text, text, timestamptz, timestamptz, text) to authenticated;
