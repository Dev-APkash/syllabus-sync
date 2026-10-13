import Link from "next/link";
import { CourseDot } from "@/components/courses/course-dot";
import type { CanvasStatus } from "@/lib/canvas/planner";
import { daysBetween, formatShortDate, formatTimeOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type CourseInfo = { id: string; code: string | null; name: string; color: string | null };
export type WeekItem = {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  weight_percent: number | null;
  course: CourseInfo;
  /** What Canvas says about it, when Canvas is linked and has the same item. */
  canvasStatus?: CanvasStatus;
  /** Set for items that only exist in Canvas: a link into Canvas instead of the course page. */
  canvasUrl?: string | null;
  fromCanvas?: boolean;
};

const STATUS: Partial<Record<CanvasStatus, { text: string; className: string }>> = {
  submitted: { text: "Submitted", className: "text-success" },
  graded: { text: "Graded", className: "text-success" },
  missing: { text: "Missing", className: "text-destructive" },
};

/** "This week": every course's deadlines for the next 7 days, in one list. */
export function ThisWeek({ items, today, note }: { items: WeekItem[]; today: string; note?: string }) {
  return (
    <section aria-labelledby="this-week">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="this-week" className="text-sm font-medium">
          This week
        </h2>
        <span className="text-xs text-muted-foreground">{note ?? "Next 7 days, all courses"}</span>
      </div>
      {items.length ? (
        <ul className="divide-y rounded-lg border bg-card">
          {items.map((item) => (
            <WeekRow key={item.id} item={item} today={today} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground">
          Nothing due in the next 7 days.
        </p>
      )}
    </section>
  );
}

function WeekRow({ item, today }: { item: WeekItem; today: string }) {
  const days = daysBetween(today, item.due_date!);
  const status = item.canvasStatus ? STATUS[item.canvasStatus] : undefined;
  const courseLabel = item.course.code ?? item.course.name;
  const linkClass =
    "min-w-0 flex-1 truncate after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring";
  const title = (
    <>
      {item.title}
      <span className="text-muted-foreground sm:hidden"> · {courseLabel}</span>
    </>
  );

  return (
    <li className="relative flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50">
      <span className={cn("w-24 shrink-0 text-sm tabular-nums", days <= 1 ? "font-medium" : "text-muted-foreground")}>
        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : formatShortDate(item.due_date!)}
      </span>
      <CourseDot color={item.course.color} />
      <span className="hidden w-20 shrink-0 truncate text-sm tabular-nums text-muted-foreground sm:block">
        {courseLabel}
      </span>
      {item.fromCanvas ? (
        item.canvasUrl ? (
          <a href={item.canvasUrl} target="_blank" rel="noreferrer" className={linkClass}>
            {title}
          </a>
        ) : (
          <span className="min-w-0 flex-1 truncate">{title}</span>
        )
      ) : (
        <Link href={`/courses/${item.course.id}`} className={linkClass}>
          {title}
        </Link>
      )}
      {item.fromCanvas && <span className="shrink-0 rounded border px-1.5 text-xs text-muted-foreground">Canvas</span>}
      {status && <span className={cn("shrink-0 text-xs font-medium", status.className)}>{status.text}</span>}
      {item.due_time && (
        <span className="hidden shrink-0 text-sm tabular-nums text-muted-foreground sm:block">
          {formatTimeOnly(item.due_time)}
        </span>
      )}
      <span className="w-10 shrink-0 text-right text-sm tabular-nums">
        {item.weight_percent !== null ? `${item.weight_percent}%` : ""}
      </span>
    </li>
  );
}
