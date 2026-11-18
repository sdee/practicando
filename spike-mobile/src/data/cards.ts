// Fixed 20-card spike dataset — hand-written, no backend/precompute.
// Common verbs across yo / tú / él in present + preterite (indicative).
// Deliberately includes accented forms (caminó, hablé, viví) and irregulars
// (tuvo, tuve, soy, eres, es, fue) so the later Whisper spike is stressed on the
// exact short forms STT struggles with.

export type Pronoun = 'yo' | 'tú' | 'él';
export type Tense = 'present' | 'preterite';

export interface Card {
  id: number;
  verb: string;
  pronoun: Pronoun;
  tense: Tense;
  mood: 'indicative';
  answer: string;
}

export const CARDS: Card[] = [
  { id: 1, verb: 'caminar', pronoun: 'yo', tense: 'present', mood: 'indicative', answer: 'camino' },
  { id: 2, verb: 'caminar', pronoun: 'tú', tense: 'preterite', mood: 'indicative', answer: 'caminaste' },
  { id: 3, verb: 'caminar', pronoun: 'él', tense: 'preterite', mood: 'indicative', answer: 'caminó' },
  { id: 4, verb: 'hablar', pronoun: 'yo', tense: 'preterite', mood: 'indicative', answer: 'hablé' },
  { id: 5, verb: 'hablar', pronoun: 'tú', tense: 'present', mood: 'indicative', answer: 'hablas' },
  { id: 6, verb: 'hablar', pronoun: 'él', tense: 'present', mood: 'indicative', answer: 'habla' },
  { id: 7, verb: 'comer', pronoun: 'yo', tense: 'present', mood: 'indicative', answer: 'como' },
  { id: 8, verb: 'comer', pronoun: 'tú', tense: 'preterite', mood: 'indicative', answer: 'comiste' },
  { id: 9, verb: 'comer', pronoun: 'él', tense: 'present', mood: 'indicative', answer: 'come' },
  { id: 10, verb: 'vivir', pronoun: 'yo', tense: 'preterite', mood: 'indicative', answer: 'viví' },
  { id: 11, verb: 'vivir', pronoun: 'tú', tense: 'present', mood: 'indicative', answer: 'vives' },
  { id: 12, verb: 'vivir', pronoun: 'él', tense: 'preterite', mood: 'indicative', answer: 'vivió' },
  { id: 13, verb: 'tener', pronoun: 'yo', tense: 'present', mood: 'indicative', answer: 'tengo' },
  { id: 14, verb: 'tener', pronoun: 'tú', tense: 'present', mood: 'indicative', answer: 'tienes' },
  { id: 15, verb: 'tener', pronoun: 'yo', tense: 'preterite', mood: 'indicative', answer: 'tuve' },
  { id: 16, verb: 'tener', pronoun: 'él', tense: 'preterite', mood: 'indicative', answer: 'tuvo' },
  { id: 17, verb: 'ser', pronoun: 'yo', tense: 'present', mood: 'indicative', answer: 'soy' },
  { id: 18, verb: 'ser', pronoun: 'tú', tense: 'present', mood: 'indicative', answer: 'eres' },
  { id: 19, verb: 'ser', pronoun: 'él', tense: 'present', mood: 'indicative', answer: 'es' },
  { id: 20, verb: 'ser', pronoun: 'él', tense: 'preterite', mood: 'indicative', answer: 'fue' },
];

// Lenient compare for the UX spike: lowercase, trim, strip diacritics.
// NOTE: stripping accents means "camino" would match "caminó" — fine for a
// swipe-feel spike, but accent strictness is a real Level-1 decision (see
// PWA_SCOPING.md §6) to revisit for the Whisper spike / real app.
export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Accent-preserving key (NFC so composed "é" and decomposed "e +  ́" match).
function strictKey(s: string): string {
  return s.trim().toLowerCase().normalize('NFC');
}

export interface Grade {
  correct: boolean;
  accentIssue: boolean; // matched except for accents
}

// Three-way grade:
//  - exact (accents included)        -> correct
//  - matches only when accents dropped -> "accent issue": correct in Lenient
//    (with a warning), incorrect in Strict
//  - otherwise                        -> incorrect
export function gradeAnswer(attempt: string, answer: string, strict: boolean): Grade {
  if (strictKey(attempt) === strictKey(answer)) return { correct: true, accentIssue: false };
  if (normalize(attempt) === normalize(answer)) return { correct: !strict, accentIssue: true };
  return { correct: false, accentIssue: false };
}
