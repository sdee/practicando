import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generateQuestions, getTopVerbs, getVerbConjugations, parseVerbClass } from './conjugations';

// Serve public/data from disk in place of the browser's fetch.
beforeAll(() => {
  vi.stubGlobal('fetch', async (path: string) => ({
    ok: true,
    json: async () => JSON.parse(readFileSync(`public${path}`, 'utf8')),
  }));
});

describe('bundled verb data', () => {
  it('parses verb classes', () => {
    expect(parseVerbClass('top50')).toBe(50);
    expect(() => parseVerbClass('tricky')).toThrow();
  });

  it('ranks verbs by frequency', async () => {
    expect((await getTopVerbs('top3'))).toEqual(['ser', 'ir', 'estar']);
  });

  it('keeps the library-bug corrections', async () => {
    const poner = await getVerbConjugations('poner');
    expect(poner['present_yo']).toBe('pongo');
    const poder = await getVerbConjugations('poder');
    expect(poder['future_yo']).toBe('podré');
  });

  it('generates unique, answerable questions', async () => {
    const qs = await generateQuestions(['yo', 'tu'], ['present', 'preterite'], ['indicative'], 10, 'top20');
    expect(qs).toHaveLength(10);
    expect(new Set(qs.map((q) => `${q.verb}|${q.pronoun}|${q.tense}|${q.mood}`)).size).toBe(10);
    expect(qs.every((q) => q.answer.length > 1)).toBe(true);
  });

  it('reads verbs outside the first shard', async () => {
    const qs = await generateQuestions(['yo'], ['present'], ['indicative'], 5, 'top500');
    expect(qs).toHaveLength(5);
  });

  it('skips impossible mood/tense combos', async () => {
    const qs = await generateQuestions(['yo'], ['present_perfect'], ['imperative'], 3, 'top10');
    expect(qs).toHaveLength(0);
  });
});
