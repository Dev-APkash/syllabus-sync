// Turns Canvas assignments into what a student wants at a glance: what's due soon
// (and whether it's handed in), what's missing, and what's been graded.
import type { CanvasAssignment, CanvasCourse } from "./schema";

export type AssignmentStatus = "graded" | "submitted" | "missing" | "excused" | "not_submitted";

export function assignmentStatus(a: CanvasAssignment): AssignmentStatus {
  const s = a.submission;
  if (s?.excused) return "excused";
  // A graded submission whose score is hidden (not posted yet) counts as submitted.
  if (s?.workflow_state === "graded" && s.score != null) return "graded";
  if (s?.missing) return "missing";
  if (s?.submitted_at || ["submitted", "pending_review", "graded"].includes(s?.workflow_state ?? "")) {
    return "submitted";
  }
  return "not_submitted";
}

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : 0);

export function summarizeAssignments(assignments: CanvasAssignment[], now: Date, days = 14) {
  const start = now.getTime();
  const end = start + days * 86_400_000;
  const withStatus = assignments.map((a) => ({ ...a, status: assignmentStatus(a) }));
  return {
    /** Due in the next `days` days and not graded yet, soonest first. */
    dueSoon: withStatus
      .filter((a) => a.due_at && time(a.due_at) >= start && time(a.due_at) <= end)
      .filter((a) => a.status !== "graded" && a.status !== "excused")
      .sort((a, b) => time(a.due_at) - time(b.due_at)),
    /** Canvas has marked these missing, most recent first. */
    missing: withStatus.filter((a) => a.status === "missing").sort((a, b) => time(b.due_at) - time(a.due_at)),
    /** Graded with a visible score, most recently graded first. */
    graded: withStatus
      .filter((a) => a.status === "graded")
      .sort((a, b) => time(b.submission?.graded_at ?? b.due_at) - time(a.submission?.graded_at ?? a.due_at)),
  };
}

/** 18 out of 20 → 90; null when there's nothing to divide by. */
export function scorePercent(a: CanvasAssignment): number | null {
  const score = a.submission?.score;
  if (score == null || !a.points_possible) return null;
  return Math.round((score / a.points_possible) * 1000) / 10;
}

const squash = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Canvas marks (as %) for syllabus items, matched by name: one name starts with the other
 * ("Quiz 1" ↔ "Quiz 1 - HTML"), ignoring case and spaces. Each Canvas assignment is used
 * once, exact name matches first, so "Assignment 1" doesn't grab "Assignment 10".
 */
export function matchCanvasMarks(
  items: { id: string; title: string }[],
  assignments: CanvasAssignment[],
): Record<string, number> {
  const graded = assignments.flatMap((a) => {
    const percent = assignmentStatus(a) === "graded" ? scorePercent(a) : null;
    return percent === null ? [] : [{ id: a.id, key: squash(a.name), percent }];
  });
  const used = new Set<number>();
  const marks: Record<string, number> = {};
  for (const exact of [true, false]) {
    for (const item of items) {
      const key = squash(item.title);
      if (marks[item.id] !== undefined || key.length < 3) continue;
      const match = graded.find(
        (g) => !used.has(g.id) && (exact ? g.key === key : g.key.startsWith(key) || key.startsWith(g.key)),
      );
      if (match) {
        used.add(match.id);
        marks[item.id] = match.percent;
      }
    }
  }
  return marks;
}

/** The Canvas course whose code or name contains this course code ("INFR3120" ↔ "INFR3120U - Web…"). */
export function matchCanvasCourse(code: string | null, courses: CanvasCourse[]): number | null {
  const key = squash(code ?? "");
  if (key.length < 4) return null;
  return courses.find((c) => squash(`${c.course_code ?? ""} ${c.name ?? ""}`).includes(key))?.id ?? null;
}

/** The student's current score in a Canvas course, if Canvas shows it to them. */
export function currentScore(course: CanvasCourse): { score: number | null; grade: string | null } {
  const enrollment = course.enrollments?.find((e) => e.type === "student");
  return { score: enrollment?.computed_current_score ?? null, grade: enrollment?.computed_current_grade ?? null };
}

/** "2026-10-14T03:59:00Z" in Toronto → "Tue, Oct 13, 11:59 PM". */
export function formatDueAt(iso: string, timeZone: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  let text: string;
  try {
    text = new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(new Date(iso));
  } catch {
    text = new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(iso));
  }
  return text.replace(/ /g, " "); // newer ICU puts a narrow no-break space before "PM"
}
