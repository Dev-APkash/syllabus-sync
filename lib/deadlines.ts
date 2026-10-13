// Sorts a course's confirmed deadlines into what the student cares about first:
// what's next, what comes later, what has no date yet, and what's already past.
// Dates are compared as "YYYY-MM-DD" strings against today's date in the student's
// time zone (lib/dates.ts todayInTimeZone), so nothing is shifted to UTC.

export type Datable = {
  due_date: string | null;
  due_time: string | null;
  weight_percent: number | null;
  /** Set when the student ticked it off (migration 0006). */
  completed_at?: string | null;
};

export const isDone = (item: Datable) => Boolean(item.completed_at);

export type SplitDeadlines<T> = {
  /** Everything not yet done on the nearest upcoming date (often one item, sometimes several). */
  next: T[];
  /** Other upcoming items, soonest first, including ones already ticked off. */
  later: T[];
  /** Items whose date isn't known yet. */
  undated: T[];
  /** Items before today, most recent first. */
  past: T[];
};

// All-day items sort before timed ones on the same date. Undated items sort last ("~" > digits).
const sortKey = (item: Datable) => (item.due_date ? `${item.due_date} ${item.due_time ?? ""}` : "~");
// Plain character order, not localeCompare (whose language rules put "~" before digits).
const byKey = (a: Datable, b: Datable) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0);

export function splitDeadlines<T extends Datable>(items: T[], today: string): SplitDeadlines<T> {
  const upcoming = items.filter((i) => i.due_date && i.due_date >= today).sort(byKey);
  const nextDate = upcoming.find((i) => !isDone(i))?.due_date;
  const isNext = (i: T) => !isDone(i) && i.due_date === nextDate;
  return {
    next: upcoming.filter(isNext),
    later: upcoming.filter((i) => !isNext(i)),
    undated: items.filter((i) => !i.due_date),
    past: items.filter((i) => i.due_date && i.due_date < today).sort((a, b) => byKey(b, a)),
  };
}

/** Share of the final grade that is still ahead: upcoming plus undated items. */
export function weightStillToCome(items: Datable[], today: string): number {
  const total = items
    .filter((i) => !i.due_date || i.due_date >= today)
    .reduce((sum, i) => sum + (i.weight_percent ?? 0), 0);
  return Math.round(total * 100) / 100;
}

/** The soonest upcoming item for each course, keyed by course id. */
export function nextDeadlineByCourse<T extends Datable & { course_id: string }>(
  items: T[],
  today: string,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of [...items].sort(byKey)) {
    if (item.due_date && item.due_date >= today && !result.has(item.course_id)) result.set(item.course_id, item);
  }
  return result;
}

/** Everything due from today up to `days - 1` days ahead (7 = today plus the next six days), soonest first. */
export function dueWithin<T extends Datable>(items: T[], today: string, days: number): T[] {
  const last = addDays(today, days - 1);
  return items.filter((i) => i.due_date && i.due_date >= today && i.due_date <= last).sort(byKey);
}

/**
 * Upcoming exams grouped by course: dated ones soonest first, then ones with no date yet
 * (a final "TBA"). Past exams are left out. Courses keep the order of `courseOrder`.
 */
export function upcomingExamsByCourse<T extends Datable & { course_id: string; kind: string }>(
  items: T[],
  today: string,
  examKinds: readonly string[],
  courseOrder: string[],
): { courseId: string; exams: T[] }[] {
  const exams = items.filter((i) => examKinds.includes(i.kind) && (!i.due_date || i.due_date >= today));
  return courseOrder
    .map((courseId) => ({
      courseId,
      exams: exams.filter((i) => i.course_id === courseId).sort(byKey),
    }))
    .filter((group) => group.exams.length > 0);
}

/** Each course's last deadline, or null if any of its deadlines has no date yet (e.g. a final "TBA"). */
export function lastDueDateByCourse(items: (Datable & { course_id: string })[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const item of items) {
    const previous = result[item.course_id];
    if (previous === null) continue;
    result[item.course_id] = !item.due_date ? null : previous && previous > item.due_date ? previous : item.due_date;
  }
  return result;
}

/**
 * A term is over once its last deadline is more than two weeks past (time for late
 * grades and finals). A term with no dated deadlines at all is never "over".
 */
export function isTermOver(lastDueDates: (string | null)[], today: string): boolean {
  const dated = lastDueDates.filter((d): d is string => Boolean(d));
  if (!dated.length || dated.length < lastDueDates.length) return false;
  const last = dated.reduce((a, b) => (a > b ? a : b));
  return addDays(last, 14) < today;
}

/** "2026-10-11" + 6 → "2026-10-17", date-only maths in UTC so no time zone can shift it. */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
