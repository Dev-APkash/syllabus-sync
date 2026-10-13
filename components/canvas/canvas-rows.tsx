import type { CanvasAssignment } from "@/lib/canvas/schema";
import { formatDueAt, scorePercent, type AssignmentStatus } from "@/lib/canvas/summary";
import { daysBetween, relativeDays, todayInTimeZone } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Item = CanvasAssignment & { status: AssignmentStatus };

/** Days from today to a Canvas due time, both as calendar dates where the student is. */
function daysUntil(iso: string, timeZone: string): number {
  return daysBetween(todayInTimeZone(timeZone), todayInTimeZone(timeZone, new Date(iso)));
}

const number = (n: number) => String(Number(n.toFixed(2)));

/** The assignment name, linking to it in Canvas (only plain https links are used). */
function Title({ assignment }: { assignment: Item }) {
  const href = assignment.html_url.startsWith("https://") ? assignment.html_url : undefined;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block truncate font-medium underline-offset-4 hover:underline"
    >
      {assignment.name}
    </a>
  );
}

export function DueRow({ assignment, timeZone }: { assignment: Item; timeZone: string }) {
  const days = daysUntil(assignment.due_at!, timeZone);
  const submitted = assignment.status === "submitted";
  return (
    <li className="flex items-center justify-between gap-4 px-3 py-2.5">
      <div className="min-w-0">
        <Title assignment={assignment} />
        <p className="text-sm tabular-nums text-muted-foreground">
          {formatDueAt(assignment.due_at!, timeZone)} ·{" "}
          <span className={days <= 2 && !submitted ? "font-medium text-foreground" : undefined}>
            {relativeDays(days)}
          </span>
        </p>
      </div>
      <p className={cn("shrink-0 text-sm", submitted ? "text-success" : "font-medium")}>
        {submitted ? "Submitted" : "Not submitted"}
      </p>
    </li>
  );
}

export function MissingRow({ assignment, timeZone }: { assignment: Item; timeZone: string }) {
  return (
    <li className="flex items-center justify-between gap-4 px-3 py-2.5">
      <div className="min-w-0">
        <Title assignment={assignment} />
        {assignment.due_at && (
          <p className="text-sm tabular-nums text-muted-foreground">
            Was due {formatDueAt(assignment.due_at, timeZone)}
          </p>
        )}
      </div>
      <p className="shrink-0 text-sm font-medium text-destructive">Missing</p>
    </li>
  );
}

export function GradedRow({ assignment }: { assignment: Item }) {
  const score = assignment.submission?.score;
  const percent = scorePercent(assignment);
  return (
    <li className="flex items-center justify-between gap-4 px-3 py-2.5">
      <div className="min-w-0">
        <Title assignment={assignment} />
        {percent !== null && <p className="text-sm tabular-nums text-muted-foreground">{number(percent)}%</p>}
      </div>
      <p className="shrink-0 text-right text-sm tabular-nums">
        {score != null && assignment.points_possible
          ? `${number(score)} / ${number(assignment.points_possible)}`
          : (assignment.submission?.grade ?? "Graded")}
      </p>
    </li>
  );
}
