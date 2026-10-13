// Turns confirmed assessments into the text of an .ics calendar file (PLAN.md Task 5.1).
import { fromZonedTime } from "date-fns-tz";
import { createEvents, type DateArray, type EventAttributes } from "ics";

export type FeedItem = {
  id: string;
  title: string;
  course_id: string;
  course_code: string | null;
  due_date: string | null; // "YYYY-MM-DD"
  due_time: string | null; // "HH:MM" or "HH:MM:SS"; null = all-day
  weight_percent: number | null;
  date_text: string | null;
  include_in_calendar: boolean;
};

type Options = { timeZone: string; siteUrl: string };

function dateParts(isoDate: string): DateArray {
  const [y, m, d] = isoDate.split("-").map(Number);
  return [y, m, d];
}

/** The day after a date-only value, computed without any time zone. */
function nextDay(isoDate: string): DateArray {
  const [y, m, d] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return [next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()];
}

function utcParts(date: Date): DateArray {
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()];
}

function toEvent(item: FeedItem & { due_date: string }, { timeZone, siteUrl }: Options): EventAttributes {
  const weight = item.weight_percent === null ? "" : ` (${item.weight_percent}%)`;
  const courseUrl = `${siteUrl}/courses/${item.course_id}`;
  const description = [
    item.weight_percent === null ? "Weight: unknown" : `Weight: ${item.weight_percent}% of your final grade`,
    item.date_text ? `Syllabus says: ${item.date_text}` : null,
    courseUrl,
  ]
    .filter(Boolean)
    .join("\n");

  const common = {
    uid: `${item.id}@syllabussync`, // stable, so edits move the event instead of duplicating it
    title: `${item.course_code ? `${item.course_code} · ` : ""}${item.title}${weight}`,
    description,
    url: courseUrl,
  };

  if (!item.due_time) {
    // All-day event: [year, month, day] only. Never converted to UTC (that shifts the day).
    return { ...common, start: dateParts(item.due_date), end: nextDay(item.due_date) };
  }

  // Timed deadline: the moment it's due in the student's time zone, converted to UTC
  // (Vercel's servers run in UTC, so we never rely on the server's local time).
  const due = fromZonedTime(`${item.due_date}T${item.due_time.slice(0, 5)}:00`, timeZone);
  const start = new Date(due.getTime() - 30 * 60 * 1000);
  return {
    ...common,
    start: utcParts(start),
    startInputType: "utc",
    startOutputType: "utc",
    end: utcParts(due),
    endInputType: "utc",
    endOutputType: "utc",
  };
}

/** Never includes the student's name or email: only course codes, titles and dates. */
export function buildIcs(items: FeedItem[], options: Options): string {
  const events = items
    .filter((item): item is FeedItem & { due_date: string } => !!item.due_date && item.include_in_calendar)
    .map((item) => toEvent(item, options));

  const { error, value } = createEvents(events, { productId: "syllabus-sync", calName: "Syllabus Sync" });
  if (error || !value) throw error ?? new Error("Could not build the calendar");
  return value;
}
