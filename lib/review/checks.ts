// The review screen's "Checks" (PLAN.md Task 4.3). Pure functions, so they can
// run live in the browser as the student edits, and be unit-tested.
import { addMonthsToDate, formatDateOnly } from "@/lib/dates";

export type CheckRow = {
  title: string;
  due_date: string; // "" = no date
  weight_percent: number | null;
  confidence?: string;
};

export type Check = { level: "ok" | "warn"; message: string };

/** Total of all weights, rounded to avoid 99.99999 from decimal maths. */
export function weightTotal(rows: CheckRow[]): number {
  const total = rows.reduce((sum, r) => sum + (r.weight_percent ?? 0), 0);
  return Math.round(total * 100) / 100;
}

export function weightCheck(rows: CheckRow[]): Check {
  const total = weightTotal(rows);
  if (Math.abs(total - 100) < 0.01) return { level: "ok", message: "Weights add up to 100%." };
  const diff = Math.round(Math.abs(100 - total) * 100) / 100;
  return total < 100
    ? { level: "warn", message: `Weights add up to ${total}%, so ${diff}% is missing.` }
    : { level: "warn", message: `Weights add up to ${total}%, which is ${diff}% too much.` };
}

export function undatedCheck(rows: CheckRow[]): Check | null {
  const count = rows.filter((r) => !r.due_date).length;
  if (!count) return null;
  return {
    level: "warn",
    message: `${count} item${count === 1 ? " has" : "s have"} no date, so ${count === 1 ? "it" : "they"} won't appear in your calendar.`,
  };
}

/** Dates before the first day of classes, or more than 5 months after it. */
export function outOfTermCheck(rows: CheckRow[], termStartDate: string | null): Check | null {
  if (!termStartDate) return null;
  const latest = addMonthsToDate(termStartDate, 5);
  const outside = rows.filter((r) => r.due_date && (r.due_date < termStartDate || r.due_date > latest));
  if (!outside.length) return null;
  const list = outside.map((r) => `${r.title || "Untitled"} (${formatDateOnly(r.due_date)})`).join(", ");
  return { level: "warn", message: `Outside the term dates: ${list}. Check these.` };
}

/** Same title (ignoring case and spaces) on the same date. */
export function duplicateCheck(rows: CheckRow[]): Check | null {
  const seen = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.title.trim().toLowerCase().replace(/\s+/g, " ")}|${r.due_date}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([key]) => key.split("|")[0]);
  if (!dupes.length) return null;
  return { level: "warn", message: `Possible duplicates: ${dupes.join(", ")}.` };
}

export function runChecks(rows: CheckRow[], termStartDate: string | null): Check[] {
  return [weightCheck(rows), undatedCheck(rows), outOfTermCheck(rows, termStartDate), duplicateCheck(rows)].filter(
    (c): c is Check => c !== null,
  );
}

/** Why a row is highlighted for attention (empty = looks fine). */
export function rowAttention(row: CheckRow): string[] {
  const reasons: string[] = [];
  if (row.confidence === "low") reasons.push("the AI wasn't sure");
  if (!row.due_date) reasons.push("no date");
  if (row.weight_percent === null) reasons.push("no weight");
  return reasons;
}
