/** Pure helpers for spoken answers. */

/** Whisper returns sentences ("Tengo.", "¿Tengo?") — keep just the word(s). */
export function cleanTranscript(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/[.,;:!?¡¿"“”'‘’()\[\]…]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Accent- and case-insensitive key. */
export function foldAccents(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

/**
 * Speech carries no accent marks, so a spoken answer is correct when it matches the target
 * ignoring accents (typed answers stay exact).
 */
export function gradeSpoken(transcript: string, answer: string): { text: string; correct: boolean } {
  const text = cleanTranscript(transcript);
  const correct = text !== '' && foldAccents(text) === foldAccents(answer);
  return { text: correct ? answer : text, correct };
}
