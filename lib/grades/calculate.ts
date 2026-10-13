/*
 * "What do I need on the final?" (PLAN.md section 5, step 7, and Task 6.1)
 *
 * In plain English: every item is worth some share of your grade (its weight).
 *   earned so far   = for each marked item, your mark × its weight (e.g. 85% × 30 = 25.5 points)
 *   other remaining = unmarked items other than the final, assumed at your current
 *                     average (or at a percentage you choose)
 *   needed on final = (target − earned so far − other remaining) ÷ the final's weight
 *
 * Example: assignments 30% (85%), midterm 30% (70%), final 40%, target 80%.
 *   earned = 25.5 + 21 = 46.5 points → needed = (80 − 46.5) ÷ 40 = 83.75% on the final.
 */

export type GradeItem = {
  id: string;
  title: string;
  weight_percent: number | null;
  score_percent: number | null;
};

export type Assumption = { type: "current_average" } | { type: "fixed"; percent: number };

export type GradeStatus = "reachable" | "already_secured" | "not_reachable" | "not_enough_info";

export type GradeResult = {
  currentAverage: number | null; // average % on marked work, weighted
  weightMarked: number; // how much of the course is marked so far, in %
  neededOnFinal: number | null;
  status: GradeStatus;
  warnings: string[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateNeededOnFinal(input: {
  items: GradeItem[];
  finalItemId: string;
  targetGrade: number;
  assumption: Assumption;
}): GradeResult {
  const { items, finalItemId, targetGrade, assumption } = input;
  const warnings: string[] = [];

  const totalWeight = round2(items.reduce((sum, i) => sum + (i.weight_percent ?? 0), 0));
  if (Math.abs(totalWeight - 100) >= 0.01) {
    warnings.push(`Weights add up to ${totalWeight}%, not 100%, so this result may be off.`);
  }

  const others = items.filter((i) => i.id !== finalItemId && (i.weight_percent ?? 0) > 0);
  const marked = others.filter((i) => i.score_percent !== null);
  const earned = marked.reduce((sum, i) => sum + ((i.score_percent ?? 0) * (i.weight_percent ?? 0)) / 100, 0);
  const weightMarked = round2(marked.reduce((sum, i) => sum + (i.weight_percent ?? 0), 0));
  const currentAverage = weightMarked > 0 ? round2((earned / weightMarked) * 100) : null;
  const base = { currentAverage, weightMarked, warnings };

  const final = items.find((i) => i.id === finalItemId);
  if (!final || !final.weight_percent) {
    warnings.push("The final has no weight, so we can't work out what you need on it.");
    return { ...base, neededOnFinal: null, status: "not_enough_info" };
  }

  const unmarked = others.filter((i) => i.score_percent === null);
  const assumedPercent = assumption.type === "fixed" ? assumption.percent : currentAverage;
  if (unmarked.length > 0 && assumedPercent === null) {
    return { ...base, neededOnFinal: null, status: "not_enough_info" };
  }
  const otherRemaining = unmarked.reduce((sum, i) => sum + ((assumedPercent ?? 0) * (i.weight_percent ?? 0)) / 100, 0);

  const needed = round2(((targetGrade - earned - otherRemaining) / final.weight_percent) * 100);
  const status: GradeStatus = needed <= 0 ? "already_secured" : needed > 100 ? "not_reachable" : "reachable";
  return { ...base, neededOnFinal: needed, status };
}
