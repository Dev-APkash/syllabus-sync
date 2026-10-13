// Scoring for `npm run eval`: compares extracted items with an answer key.

export type EvalItem = { title: string; due_date: string; due_time: string; weight_percent: number };

export type FileScore = {
  expected: number;
  found: number;
  missed: string[];
  extra: string[];
  datesCorrect: number;
  weightsCorrect: number;
  weightsChecked: number;
};

function words(title: string): Set<string> {
  return new Set(title.toLowerCase().match(/[a-z]+|\d+/g) ?? []);
}

/** How alike two titles are, from 0 (nothing shared) to 1 (same words). */
export function titleSimilarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / (wa.size + wb.size - shared);
}

/**
 * Pairs each expected item with at most one extracted item: fuzzy title match,
 * with a same-date bonus to tell apart e.g. two lab sections of "Lab Report 1".
 */
export function matchItems(expected: EvalItem[], actual: EvalItem[]) {
  const candidates: { e: number; a: number; score: number }[] = [];
  expected.forEach((exp, e) =>
    actual.forEach((act, a) => {
      const similarity = titleSimilarity(exp.title, act.title);
      const sameDate = exp.due_date !== "" && exp.due_date === act.due_date;
      if (similarity >= 0.5 || (sameDate && similarity >= 0.25)) {
        candidates.push({ e, a, score: similarity + (sameDate ? 0.3 : 0) });
      }
    }),
  );
  candidates.sort((x, y) => y.score - x.score);

  const usedE = new Set<number>();
  const usedA = new Set<number>();
  const pairs: [EvalItem, EvalItem][] = [];
  for (const c of candidates) {
    if (usedE.has(c.e) || usedA.has(c.a)) continue;
    usedE.add(c.e);
    usedA.add(c.a);
    pairs.push([expected[c.e], actual[c.a]]);
  }
  return {
    pairs,
    missed: expected.filter((_, i) => !usedE.has(i)),
    extra: actual.filter((_, i) => !usedA.has(i)),
  };
}

export function scoreFile(expected: EvalItem[], actual: EvalItem[]): FileScore {
  const { pairs, missed, extra } = matchItems(expected, actual);
  const withWeight = pairs.filter(([e]) => e.weight_percent >= 0);
  return {
    expected: expected.length,
    found: pairs.length,
    missed: missed.map((m) => m.title),
    extra: extra.map((x) => x.title),
    datesCorrect: pairs.filter(([e, a]) => e.due_date === a.due_date).length,
    weightsChecked: withWeight.length,
    weightsCorrect: withWeight.filter(([e, a]) => Math.abs(e.weight_percent - a.weight_percent) <= 0.5).length,
  };
}
