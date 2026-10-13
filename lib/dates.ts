// Helpers for date-only ("2027-02-05") and time-only ("23:59") values.
// They never turn a date-only value into a moment in UTC, which is what causes
// "off by one day" bugs for students west of UTC (CLAUDE.md).

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(isoDate: string): [number, number, number] {
  const [y, m, d] = isoDate.split("-").map(Number);
  return [y, m, d];
}

/** "2027-02-05" → "Fri, Feb 5, 2027" */
export function formatDateOnly(isoDate: string): string {
  const [y, m, d] = parts(isoDate);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${MONTHS[m - 1]} ${d}, ${y}`;
}

/** "2026-10-20" → "Tue, Oct 20" (for places where the year is obvious) */
export function formatShortDate(isoDate: string): string {
  return formatDateOnly(isoDate).replace(/, \d{4}$/, "");
}

/** "23:59" or "23:59:00" → "11:59 PM" */
export function formatTimeOnly(time: string): string {
  const [h, min] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(min).padStart(2, "0")} ${suffix}`;
}

/** Today's date ("2026-10-09") where the student is. The server runs in UTC, so never use its date. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  try {
    const fields = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => fields.find((f) => f.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return now.toISOString().slice(0, 10); // unknown time zone: UTC
  }
}

/** Whole days from one date-only value to another (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** 0 → "Today", 1 → "Tomorrow", 5 → "In 5 days", 20 → "In 2 weeks", -3 → "3 days ago". */
export function relativeDays(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  const n = Math.abs(days);
  const amount = n < 14 ? `${n} days` : `${Math.floor(n / 7)} weeks`;
  return days > 0 ? `In ${amount}` : `${amount} ago`;
}

/** "2026-10-11" + 6 days → "2026-10-17" (negative goes back). Date-only maths in UTC. */
export function addDaysToDate(isoDate: string, days: number): string {
  const [y, m, d] = parts(isoDate);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "2027-01-31" + 1 month → "2027-02-28" (clamped to the month's last day). */
export function addMonthsToDate(isoDate: string, months: number): string {
  const [y, m, d] = parts(isoDate);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}
