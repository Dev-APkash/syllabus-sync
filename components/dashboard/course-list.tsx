import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CourseDot } from "@/components/courses/course-dot";
import { Button } from "@/components/ui/button";
import { daysBetween, formatShortDate, relativeDays } from "@/lib/dates";
import { isTermOver } from "@/lib/deadlines";
import { cn } from "@/lib/utils";
import { RemoveUploadButton } from "./remove-upload-button";
import { RetryButton } from "./retry-button";
import { StatusBadge } from "./status-badge";

export type DashboardCourse = {
  id: string;
  code: string | null;
  name: string;
  term: string | null;
  color: string | null;
  syllabi: {
    id: string;
    original_filename: string;
    status: string;
    error_message: string | null;
    created_at: string;
  }[];
};

export type NextDeadline = { title: string; due_date: string };

type Row = { course: DashboardCourse; syllabus: DashboardCourse["syllabi"][number]; next?: NextDeadline };

const columns = "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6.5rem_1.25rem]";

/** Rows that need the student come first, then the soonest deadline. */
function sortRows(rows: Row[]): Row[] {
  const rank = (r: Row) => (r.syllabus.status === "needs_review" ? 0 : r.syllabus.status === "confirmed" ? 2 : 1);
  return [...rows].sort(
    (a, b) => rank(a) - rank(b) || (a.next?.due_date ?? "9999").localeCompare(b.next?.due_date ?? "9999"),
  );
}

/** Groups rows by term ("FALL 2026" and "Fall 2026" are the same term), keeping their order. */
function groupByTerm(rows: Row[]): { label: string; rows: Row[] }[] {
  const groups = new Map<string, { label: string; rows: Row[] }>();
  for (const row of rows) {
    const label = row.course.term?.trim() || "No term";
    const key = label.toLowerCase();
    if (!groups.has(key)) groups.set(key, { label, rows: [] });
    groups.get(key)!.rows.push(row);
  }
  return [...groups.values()];
}

/** The dashboard's course list: one row per course, sorted by what's due next. */
export function CourseList({
  courses,
  nextDeadlines,
  lastDueDates,
  today,
}: {
  courses: DashboardCourse[];
  nextDeadlines: Record<string, NextDeadline>;
  /** Each course's last deadline (null = has an undated one), to fold away terms that are over. */
  lastDueDates: Record<string, string | null>;
  today: string;
}) {
  const rows = courses.flatMap((course) =>
    course.syllabi.map((syllabus) => ({
      course,
      syllabus,
      next: syllabus.status === "confirmed" ? nextDeadlines[course.id] : undefined,
    })),
  );
  const groups = groupByTerm(sortRows(rows));
  // A term is over when all its courses are confirmed and their last deadline is two weeks past.
  const over = (group: { rows: Row[] }) =>
    group.rows.every((r) => r.syllabus.status === "confirmed") &&
    isTermOver(
      group.rows.map((r) => lastDueDates[r.course.id] ?? null),
      today,
    );
  const current = groups.filter((g) => !over(g));
  const past = groups.filter(over);

  return (
    <div className="flex flex-col gap-8">
      {current.map((group) => (
        <TermGroup key={group.label} group={group} today={today} />
      ))}
      {past.length > 0 && (
        <details className="group/past">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition-transform group-open/past:rotate-90" aria-hidden="true" />
            Past terms ({past.map((g) => g.label).join(", ")})
          </summary>
          <div className="mt-4 flex flex-col gap-8">
            {past.map((group) => (
              <TermGroup key={group.label} group={group} today={today} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TermGroup({ group, today }: { group: { label: string; rows: Row[] }; today: string }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</h2>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div
          className={cn("hidden gap-4 border-b px-5 py-2 text-xs font-medium text-muted-foreground md:grid", columns)}
        >
          <span>Course</span>
          <span>Next deadline</span>
          <span className="text-right">Due</span>
          <span className="sr-only">Open</span>
        </div>
        <ul className="divide-y">
          {group.rows.map((row) => (
            <CourseRow key={row.syllabus.id} row={row} today={today} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function CourseRow({ row: { course, syllabus, next }, today }: { row: Row; today: string }) {
  const href =
    syllabus.status === "confirmed"
      ? `/courses/${course.id}`
      : syllabus.status === "needs_review"
        ? `/syllabi/${syllabus.id}/review`
        : null;
  const days = next ? daysBetween(today, next.due_date) : null;
  const name = (
    <span className="flex items-start gap-2.5">
      <CourseDot color={course.color} className="mt-1.5" />
      <span className="min-w-0">
        {course.code ? (
          <>
            <span className="block truncate font-medium tabular-nums">{course.code}</span>
            <span className="block truncate text-sm text-muted-foreground">{course.name}</span>
          </>
        ) : (
          <span className="block truncate font-medium">{course.name}</span>
        )}
      </span>
    </span>
  );

  return (
    <li
      className={cn(
        "relative grid gap-x-4 gap-y-2 px-5 py-3.5 md:items-center",
        columns,
        href && "transition-colors hover:bg-muted/50",
      )}
    >
      <div className="min-w-0">
        {href ? (
          // The link's ::after covers the whole row, so clicking anywhere on it opens the course.
          <Link
            href={href}
            className="block after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
          >
            {name}
          </Link>
        ) : (
          name
        )}
      </div>

      {syllabus.status === "confirmed" ? (
        next && days !== null ? (
          <>
            <div className="min-w-0">
              <p className="truncate">{next.title}</p>
              <p className="text-sm tabular-nums text-muted-foreground">{formatShortDate(next.due_date)}</p>
            </div>
            <p
              className={cn("text-sm tabular-nums md:text-right", days <= 7 ? "font-medium" : "text-muted-foreground")}
            >
              {relativeDays(days)}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground md:col-span-2">No upcoming deadlines</p>
        )
      ) : (
        // Above the row-wide link, so these buttons stay clickable on their own.
        <div className="relative z-10 flex min-w-0 flex-col gap-2 md:col-span-2">
          <StatusBadge status={syllabus.status} />
          {syllabus.status === "failed" && syllabus.error_message && (
            <p className="line-clamp-2 text-sm text-destructive">{syllabus.error_message}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <SyllabusAction syllabusId={syllabus.id} status={syllabus.status} />
          </div>
        </div>
      )}

      {href && <ChevronRight className="hidden h-5 w-5 text-muted-foreground md:block" aria-hidden="true" />}
    </li>
  );
}

function SyllabusAction({ syllabusId, status }: { syllabusId: string; status: string }) {
  switch (status) {
    case "needs_review":
      return (
        <Button asChild size="sm">
          <Link href={`/syllabi/${syllabusId}/review`}>Review</Link>
        </Button>
      );
    case "failed":
    case "uploaded":
      return (
        <>
          <RetryButton syllabusId={syllabusId} label={status === "uploaded" ? "Read syllabus" : "Try again"} />
          <RemoveUploadButton syllabusId={syllabusId} />
        </>
      );
    case "extracting":
      // Normally finishes within a few minutes; this rescues one stuck after a timeout.
      return <RetryButton syllabusId={syllabusId} label="Stuck? Retry" />;
    default:
      return null;
  }
}

export function EmptyCourses() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed bg-card p-8 sm:p-10">
      <h2 className="font-serif text-2xl font-medium">No courses yet</h2>
      <p className="max-w-lg text-muted-foreground">
        Upload the syllabus or course outline for one of your classes. You&apos;ll check what we find before anything is
        added to your calendar.
      </p>
      <Button asChild>
        <Link href="/upload">Upload a syllabus</Link>
      </Button>
    </div>
  );
}
