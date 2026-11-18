export interface OverlapResult {
  prefix: string;
  remainder: string;
  length: number;
}

/**
 * Computes a longest common prefix overlap between the user's answer and the correct answer.
 * Comparison is case-insensitive. Trims both inputs. Returns null if the overlap is
 * shorter than minPrefix or inputs are empty.
 */
export function getOverlapHighlight(
  correctRaw: string | undefined | null,
  userRaw: string | undefined | null,
  minPrefix: number = 3
): OverlapResult | null {
  const correct = (correctRaw ?? '').trim();
  const user = (userRaw ?? '').trim();
  if (!correct || !user) return null;

  const a = correct.toLowerCase();
  const b = user.toLowerCase();
  let i = 0;
  const max = Math.min(a.length, b.length);
  while (i < max && a[i] === b[i]) i++;

  if (i >= minPrefix) {
    return { prefix: correct.slice(0, i), remainder: correct.slice(i), length: i };
  }
  return null;
}
