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

/** Items (already sorted by date) split into one group per day. */
function groupByDay(items: WeekItem[]): { date: string; items: WeekItem[] }[] {
  const days: { date: string; items: WeekItem[] }[] = [];
  for (const item of items) {
    const last = days.at(-1);
    if (last?.date === item.due_date) last.items.push(item);
    else days.push({ date: item.due_date!, items: [item] });
  }
  return days;
}

/** "This week": every course's deadlines for the next 7 days, one block per day. */
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
        <div className="overflow-hidden rounded-lg border bg-card">
          {groupByDay(items).map((day) => (
            <DayGroup key={day.date} date={day.date} items={day.items} today={today} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground">
          Nothing due in the next 7 days.
        </p>
      )}
    </section>
  );
}

function DayGroup({ date, items, today }: { date: string; items: WeekItem[]; today: string }) {
  const days = daysBetween(today, date);
  const [weekday, monthDay] = formatShortDate(date).split(", "); // "Tue", "Oct 20"
  const label = days === 0 ? "Today" : days === 1 ? "Tomorrow" : weekday;
  return (
    <div className="border-b last:border-b-0">
      <h3
        className={cn(
          "flex items-baseline justify-between gap-3 bg-muted/40 px-4 py-1.5 text-xs",
          days === 0 && "bg-primary/10",
        )}
      >
        <span>
          <span className="font-semibold uppercase tracking-wide">{label}</span>
          <span className="ml-2 tabular-nums text-muted-foreground">
            {days <= 1 ? `${weekday}, ${monthDay}` : monthDay}
          </span>
        </span>
        <span className="tabular-nums text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </h3>
      <ul className="divide-y">
        {items.map((item) => (
          <WeekRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function WeekRow({ item }: { item: WeekItem }) {
  const status = item.canvasStatus ? STATUS[item.canvasStatus] : undefined;
  const courseLabel = item.course.code ?? item.course.name;
  const handedIn = item.canvasStatus === "submitted" || item.canvasStatus === "graded";
  const linkClass =
    "block truncate after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring";

  return (
    <li
      className={cn(
        "relative flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50",
        handedIn && "text-muted-foreground",
      )}
    >
      <CourseDot color={item.course.color} />
      <div className="min-w-0 flex-1">
        {item.fromCanvas ? (
          item.canvasUrl ? (
            <a href={item.canvasUrl} target="_blank" rel="noreferrer" className={linkClass}>
              {item.title}
            </a>
          ) : (
            <span className="block truncate">{item.title}</span>
          )
        ) : (
          <Link href={`/courses/${item.course.id}`} className={linkClass}>
            {item.title}
          </Link>
        )}
        <p className="truncate text-xs tabular-nums text-muted-foreground">
          {courseLabel}
          {item.due_time && ` · ${formatTimeOnly(item.due_time)}`}
          {item.fromCanvas && " · from Canvas"}
        </p>
      </div>
      {status && <span className={cn("shrink-0 text-xs font-medium", status.className)}>{status.text}</span>}
      {item.weight_percent !== null && (
        <span
          className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums"
          title="Share of the final grade"
        >
          {item.weight_percent}%
        </span>
      )}
    </li>
  );
}
