// Merges Canvas's planner (what's due across all courses) into the dashboard's "This week":
// a Canvas item that matches a syllabus deadline adds its status ("Submitted") to that row;
// one that doesn't (e.g. a surprise quiz) becomes its own row, marked as coming from Canvas.
import { todayInTimeZone } from "@/lib/dates";
import type { PlannerItem } from "./schema";

export type CanvasStatus = "graded" | "submitted" | "missing" | "excused" | "not_submitted";

/** Only things that are graded and can be due; not notes, events or announcements. */
const GRADED_TYPES = ["assignment", "quiz", "discussion_topic"];

export type CanvasWeekItem = {
  key: string;
  title: string;
  /** "YYYY-MM-DD" in the student's time zone. */
  dueDate: string;
  dueAt: string;
  /** The Canvas course id, matched to a Syllabus Sync course by the caller. */
  canvasCourseId: number;
  status: CanvasStatus;
  /** Full https link to the item in Canvas, or null. */
  url: string | null;
};

export function plannerStatus(item: PlannerItem): CanvasStatus {
  const s = item.submissions;
  if (!s) return "not_submitted";
  if (s.excused) return "excused";
  if (s.graded) return "graded";
  if (s.submitted) return "submitted";
  if (s.missing) return "missing";
  return "not_submitted";
}

/** Planner items as dated, graded Canvas work in the student's time zone. */
export function toCanvasWeekItems(items: PlannerItem[], baseUrl: string, timeZone: string): CanvasWeekItem[] {
  return items.flatMap((item) => {
    if (!GRADED_TYPES.includes(item.plannable_type) || !item.course_id) return [];
    const dueAt = item.plannable.due_at ?? item.plannable_date;
    const url = item.html_url ? new URL(item.html_url, baseUrl) : null;
    return [
      {
        key: `${item.plannable_type}-${item.plannable_id}`,
        title: item.plannable.title ?? "Canvas item",
        dueDate: todayInTimeZone(timeZone, new Date(dueAt)),
        dueAt,
        canvasCourseId: item.course_id,
        status: plannerStatus(item),
        // Only links to the student's own Canvas server.
        url: url && url.origin === baseUrl ? url.toString() : null,
      },
    ];
  });
}

/** "2026-10-14T03:59:00Z" in Toronto → "23:59" (24-hour, like the database's due_time). */
export function timeInZone(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

type Matchable = { id: string; title: string; due_date: string | null; course_id: string };
type CourseCanvasItem = CanvasWeekItem & { courseId: string };

/**
 * Pairs each syllabus deadline with the same Canvas item (same course, same day, similar name).
 * Returns the Canvas status for matched deadlines, and the Canvas items with no match.
 */
export function mergeWithCanvas<C extends CourseCanvasItem>(
  syllabus: Matchable[],
  canvas: C[],
): { statuses: Record<string, CanvasStatus>; extras: C[] } {
  const statuses: Record<string, CanvasStatus> = {};
  const used = new Set<string>();
  for (const item of syllabus) {
    const match = canvas.find((c) => !used.has(c.key) && c.courseId === item.course_id && sameItem(item, c));
    if (match) {
      used.add(match.key);
      statuses[item.id] = match.status;
    }
  }
  return { statuses, extras: canvas.filter((c) => !used.has(c.key)) };
}

const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Same day and one title contains the other ("Quiz 4" ↔ "Quiz 4 - HTML"), ignoring case and spaces. */
export function sameItem(syllabus: { title: string; due_date: string | null }, canvas: CanvasWeekItem): boolean {
  if (syllabus.due_date !== canvas.dueDate) return false;
  const a = squash(syllabus.title);
  const b = squash(canvas.title);
  return a.length > 2 && b.length > 2 && (a.includes(b) || b.includes(a));
}
