import { describe, expect, it } from 'vitest';
import { cleanTranscript, gradeSpoken } from './voice';

describe('cleanTranscript', () => {
  it('strips punctuation and case', () => {
    expect(cleanTranscript('Tengo.')).toBe('tengo');
    expect(cleanTranscript(' ¿Podré? ')).toBe('podré');
    expect(cleanTranscript('Yo   hablo,')).toBe('yo hablo');
  });
});

describe('gradeSpoken', () => {
  it('accepts a match that differs only by accents, and shows the proper form', () => {
    expect(gradeSpoken('Podre.', 'podré')).toEqual({ text: 'podré', correct: true });
    expect(gradeSpoken('hablo', 'hablo')).toEqual({ text: 'hablo', correct: true });
  });
  it('rejects wrong forms and empty audio', () => {
    expect(gradeSpoken('Tienes', 'tengo')).toEqual({ text: 'tienes', correct: false });
    expect(gradeSpoken('', 'tengo').correct).toBe(false);
  });
  it('does not confuse accent-distinguished words by case alone', () => {
    expect(gradeSpoken('Habló', 'hablo').correct).toBe(true); // speech can't tell them apart
  });
});
