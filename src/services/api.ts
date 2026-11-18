/**
 * Data layer. Same function names the components always used, now backed by bundled JSON
 * (verbs/conjugations) and Supabase (rounds/guesses) instead of the FastAPI backend.
 */
import { Round, Guess, Filters, DEFAULT_NUM_QUESTIONS } from '@/types/flashcard';
import { generateQuestions, getTopVerbs, getVerbConjugations as conjugationsFor } from '@/lib/conjugations';
import { supabase } from '@/lib/supabase';

export interface RoundResponse { round: Round; guesses: Guess[] }
export interface TransitionResponse { completed_round: Round; new_round: Round; guesses: Guess[]; transition_reason: string }
export interface VerbSet { verb_class: string; count: number; verbs: string[] }

type RoundRow = {
  id: string; started_at: string; ended_at: string | null; filters: Round['filters'];
  num_questions: number; num_correct: number;
};
type GuessRow = {
  id: string; position: number; verb: string; pronoun: string; tense: string; mood: string;
  correct_answer: string; user_answer: string | null; is_correct: boolean | null;
};

const toRound = (r: RoundRow): Round => ({
  id: r.id, started_at: r.started_at, ended_at: r.ended_at ?? undefined, filters: r.filters,
  num_questions: r.num_questions, num_correct_answers: r.num_correct, status: r.ended_at ? 'completed' : 'active',
});
const toGuess = (g: GuessRow): Guess => ({
  id: g.id, verb: g.verb, pronoun: g.pronoun, tense: g.tense, mood: g.mood, correct_answer: g.correct_answer,
  user_answer: g.user_answer ?? undefined, is_correct: g.is_correct ?? undefined,
});
const check = (error: { message: string } | null, what: string) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};

export async function createRound(filters: Filters): Promise<RoundResponse> {
  const numQuestions = filters.num_questions || DEFAULT_NUM_QUESTIONS;
  const questions = await generateQuestions(
    filters.pronouns, filters.tenses, filters.moods, numQuestions, filters.verb_class || 'top20',
  );
  if (questions.length < numQuestions) {
    throw new Error(
      `Could not generate enough questions (wanted ${numQuestions}, got ${questions.length}). ` +
        'Try different filters, a bigger verb set, or fewer questions.',
    );
  }
  const sb = supabase();
  const roundId = crypto.randomUUID();
  const { data: round, error } = await sb.from('rounds').insert({
    id: roundId, num_questions: numQuestions,
    filters: { pronouns: filters.pronouns, tenses: filters.tenses, moods: filters.moods, verb_class: filters.verb_class || 'top20' },
  }).select().single();
  check(error, "Couldn't start the round");
  const { data: guesses, error: gErr } = await sb.from('guesses').insert(
    questions.map((q, i) => ({
      id: crypto.randomUUID(), round_id: roundId, position: i,
      verb: q.verb, pronoun: q.pronoun, tense: q.tense, mood: q.mood, correct_answer: q.answer,
    })),
  ).select();
  check(gErr, "Couldn't save the questions");
  return { round: toRound(round as RoundRow), guesses: (guesses as GuessRow[]).sort((a, b) => a.position - b.position).map(toGuess) };
}

export async function completeRound(roundId: string): Promise<Round> {
  const sb = supabase();
  const { count, error: cErr } = await sb.from('guesses').select('id', { count: 'exact', head: true })
    .eq('round_id', roundId).eq('is_correct', true);
  check(cErr, "Couldn't score the round");
  const { data, error } = await sb.from('rounds')
    .update({ ended_at: new Date().toISOString(), num_correct: count ?? 0 })
    .eq('id', roundId).is('ended_at', null).select().single();
  check(error, "Couldn't finish the round");
  return toRound(data as RoundRow);
}

export async function transitionRound(currentRoundId: string, filters: Filters): Promise<TransitionResponse> {
  const completed = await completeRound(currentRoundId);
  const next = await createRound(filters);
  return { completed_round: completed, new_round: next.round, guesses: next.guesses, transition_reason: 'filter_change' };
}

/** The unfinished round to resume, if any. Rejects with 'No active round found'. */
export async function getActiveRound(): Promise<RoundResponse> {
  const sb = supabase();
  const { data, error } = await sb.from('rounds').select().is('ended_at', null)
    .order('started_at', { ascending: false }).limit(1).maybeSingle();
  check(error, "Couldn't check for an active round");
  if (!data) throw new Error('No active round found');
  const { data: guesses, error: gErr } = await sb.from('guesses').select().eq('round_id', data.id).order('position');
  check(gErr, "Couldn't load the round");
  return { round: toRound(data as RoundRow), guesses: (guesses as GuessRow[]).map(toGuess) };
}

// Per-card writes are fire-and-forget: a failure is logged, never shown mid-practice.
export async function submitGuess(guessId: string, userAnswer: string, isCorrect: boolean): Promise<void> {
  const { error } = await supabase().from('guesses').update({ user_answer: userAnswer, is_correct: isCorrect }).eq('id', guessId);
  if (error) console.error('Failed to save guess:', error.message);
}

export async function submitSkip(guessId: string): Promise<void> {
  const { error } = await supabase().from('guesses').update({ skipped: true }).eq('id', guessId);
  if (error) console.error('Failed to save skip:', error.message);
}

/** Verbs in a set, alphabetical. */
export async function getVerbSet(verbClass: string): Promise<VerbSet> {
  const verbs = (await getTopVerbs(verbClass)).sort((a, b) => a.localeCompare(b, 'es'));
  return { verb_class: verbClass, count: verbs.length, verbs };
}

export const getVerbConjugations = conjugationsFor;

// ---- History -------------------------------------------------------------------------------

export interface HistoryQuestion {
  id: string; verb: string; pronoun: string; tense: string; mood: string;
  user_answer: string; correct_answer: string; is_correct: boolean; created_at: string; skipped?: boolean;
}
export interface HistoryRound {
  id: string; started_at: string; ended_at: string | null; num_questions: number; num_correct_answers: number;
  pronouns: string[]; tenses: string[]; moods: string[]; questions?: HistoryQuestion[];
}

/** Completed rounds, newest first. `before` (an ended_at) pages further back. */
export async function getHistory(limit: number, before?: string): Promise<HistoryRound[]> {
  let q = supabase().from('rounds').select().not('ended_at', 'is', null).order('ended_at', { ascending: false }).limit(limit);
  if (before) q = q.lt('ended_at', before);
  const { data, error } = await q;
  check(error, "Couldn't load history");
  return (data as RoundRow[]).map((r) => ({
    id: r.id, started_at: r.started_at, ended_at: r.ended_at, num_questions: r.num_questions,
    num_correct_answers: r.num_correct, pronouns: r.filters?.pronouns ?? [], tenses: r.filters?.tenses ?? [], moods: r.filters?.moods ?? [],
  }));
}

export async function getRoundQuestions(roundId: string): Promise<HistoryQuestion[]> {
  const { data, error } = await supabase().from('guesses').select().eq('round_id', roundId).order('position');
  check(error, "Couldn't load the round's questions");
  return (data as (GuessRow & { skipped: boolean; created_at: string })[]).map((g) => ({
    id: g.id, verb: g.verb, pronoun: g.pronoun, tense: g.tense, mood: g.mood, user_answer: g.user_answer ?? '',
    correct_answer: g.correct_answer, is_correct: !!g.is_correct, skipped: g.skipped, created_at: g.created_at,
  }));
}

// ---- Metrics -------------------------------------------------------------------------------

export interface CoverageData {
  metadata: { total_questions: number; unique_bins: number };
  bins: { pronoun: string; tense: string; mood: string; question_count: number }[];
}

export async function getCoverage(mood: string): Promise<CoverageData> {
  const { data, error } = await supabase().rpc('coverage', { p_mood: mood });
  check(error, "Couldn't load coverage");
  const bins = (data as { pronoun: string; tense: string; mood: string; question_count: number }[]).map((b) => ({ ...b, question_count: Number(b.question_count) }));
  return { metadata: { total_questions: bins.reduce((n, b) => n + b.question_count, 0), unique_bins: bins.length }, bins };
}

export interface ActivityData {
  metric: string; period: string; total: number; average: number;
  data: { date: string; value: number; label: string }[];
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Last 7 days (per day) or last 4 weeks (per Monday-start week), zero-filled, in the user's local time zone. */
export async function getActivity(metric: 'questions' | 'rounds', period: 'week' | 'month'): Promise<ActivityData> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets: { date: string; label: string; start: Date; end: Date }[] = [];
  if (period === 'week') {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(today); start.setDate(start.getDate() - i);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      buckets.push({ date: ymd(start), label: start.toLocaleDateString('en-US', { weekday: 'short' }), start, end });
    }
  } else {
    const monday = new Date(today); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    for (let i = 3; i >= 0; i--) {
      const start = new Date(monday); start.setDate(start.getDate() - 7 * i);
      const end = new Date(start); end.setDate(end.getDate() + 7);
      buckets.push({ date: ymd(start), label: `Week ${4 - i}`, start, end });
    }
  }
  const { data, error } = await supabase().rpc('activity', {
    p_metric: metric, p_bucket: period === 'week' ? 'day' : 'week',
    p_from: buckets[0].start.toISOString(), p_to: buckets[buckets.length - 1].end.toISOString(),
    p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  check(error, "Couldn't load activity");
  const byDate = new Map((data as { bucket: string; value: number }[]).map((r) => [r.bucket, Number(r.value)]));
  const points = buckets.map((b) => ({ date: b.date, label: b.label, value: byDate.get(b.date) ?? 0 }));
  const total = points.reduce((n, p) => n + p.value, 0);
  return { metric, period, data: points, total, average: Math.round((total / points.length) * 10) / 10 };
}
