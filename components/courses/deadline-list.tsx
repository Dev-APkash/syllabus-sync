import { ChevronRight } from "lucide-react";
import { KIND_LABELS, type AssessmentKind } from "@/lib/constants";
import { daysBetween, formatDateOnly, formatTimeOnly, relativeDays } from "@/lib/dates";
import type { SplitDeadlines } from "@/lib/deadlines";
import { cn } from "@/lib/utils";
import { DoneToggle } from "./done-toggle";

export type DeadlineItem = {
  id: string;
  title: string;
  kind: string;
  due_date: string | null;
  due_time: string | null;
  weight_percent: number | null;
  include_in_calendar: boolean;
  completed_at: string | null;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2027-02" → "February 2027"; date-only maths, so no time zone can shift anything. */
function monthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function weekday(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "Quiz · 5:00 PM · not in calendar" */
function details(item: DeadlineItem): string {
  return [
    KIND_LABELS[item.kind as AssessmentKind] ?? "Other",
    item.due_time ? formatTimeOnly(item.due_time) : null,
    item.include_in_calendar ? null : "not in calendar",
  ]
    .filter(Boolean)
    .join(" · ");
}

const weightText = (item: DeadlineItem) => (item.weight_percent === null ? "—" : `${item.weight_percent}%`);

/** A course's confirmed deadlines: what's next first, past ones folded away at the bottom. */
export function DeadlineList({
  split,
  today,
  afterNextUp,
}: {
  split: SplitDeadlines<DeadlineItem>;
  today: string;
  /** Shown right below the Next up card (the Canvas panel). */
  afterNextUp?: React.ReactNode;
}) {
  const { next, later, undated, past } = split;
  return (
    <div className="flex flex-col gap-8">
      {next.length > 0 ? (
        <NextUp items={next} today={today} />
      ) : (
        <p className="rounded-lg border border-dashed bg-card p-6 text-muted-foreground">
          Nothing coming up{past.length > 0 && ": every dated deadline in this course has passed"}.
        </p>
      )}
      {afterNextUp}
      {later.length > 0 && <MonthGroups items={later} today={today} />}
      {undated.length > 0 && <Group title="Date not announced yet" items={undated} today={today} />}
      {past.length > 0 && (
        <details className="group">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden="true" />
            Past deadlines ({past.length})
          </summary>
          <div className="mt-4">
            <MonthGroups items={past} today={today} muted />
          </div>
        </details>
      )}
    </div>
  );
}

function NextUp({ items, today }: { items: DeadlineItem[]; today: string }) {
  const date = items[0].due_date!;
  return (
    <section aria-labelledby="next-up" className="rounded-lg border border-primary/40 bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-5 py-3">
        <h2 id="next-up" className="text-sm font-medium text-primary">
          Next up
        </h2>
        <p className="text-sm tabular-nums">
          <span className="font-medium">{relativeDays(daysBetween(today, date))}</span>
          <span className="text-muted-foreground"> · {formatDateOnly(date)}</span>
        </p>
      </div>
      <ul className="divide-y">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 px-5 py-4">
            <DoneToggle assessmentId={item.id} title={item.title} done={false} />
            <div className="min-w-0 flex-1">
              <p className="font-serif text-2xl font-medium leading-tight">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{details(item)}</p>
            </div>
            <p className="shrink-0 text-right tabular-nums">
              <span className="block font-serif text-2xl leading-tight">{weightText(item)}</span>
              <span className="block text-sm text-muted-foreground">of your grade</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Groups items by month, keeping their order (soonest first, or most recent first for past items). */
function MonthGroups({ items, today, muted }: { items: DeadlineItem[]; today: string; muted?: boolean }) {
  const groups = new Map<string, DeadlineItem[]>();
  for (const item of items) {
    const key = item.due_date!.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return (
    <div className="flex flex-col gap-8">
      {[...groups.entries()].map(([key, group]) => (
        <Group key={key} title={monthLabel(key)} items={group} today={today} muted={muted} />
      ))}
    </div>
  );
}

function Group({
  title,
  items,
  today,
  muted,
}: {
  title: string;
  items: DeadlineItem[];
  today: string;
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="divide-y rounded-lg border bg-card">
        {items.map((item) => (
          <Row key={item.id} item={item} today={today} muted={muted} />
        ))}
      </ul>
    </section>
  );
}

function Row({ item, today, muted }: { item: DeadlineItem; today: string; muted?: boolean }) {
  const days = item.due_date ? daysBetween(today, item.due_date) : null;
  const done = Boolean(item.completed_at);
  const thisWeek = days !== null && days >= 0 && days <= 7 && !done;
  return (
    <li className={cn("flex items-center gap-4 px-4 py-3", (muted || done) && "text-muted-foreground")}>
      <DoneToggle assessmentId={item.id} title={item.title} done={done} />
      <div className="w-11 shrink-0 text-center tabular-nums" aria-hidden={!item.due_date}>
        {item.due_date ? (
          <>
            <span className="block text-xs uppercase tracking-wide text-muted-foreground">
              {weekday(item.due_date)}
            </span>
            <span className="block font-serif text-2xl leading-none">{Number(item.due_date.slice(8, 10))}</span>
          </>
        ) : (
          <span className="block text-sm text-muted-foreground">TBA</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate", muted || done ? "font-normal" : "font-medium", done && "line-through")}>
          {item.title}
        </p>
        <p className="text-sm text-muted-foreground">
          {details(item)}
          {done && " · done"}
        </p>
      </div>
      <div className="shrink-0 text-right text-sm tabular-nums">
        <p>{weightText(item)}</p>
        {days !== null && (
          <p className={thisWeek && !muted ? "font-medium text-foreground" : "text-muted-foreground"}>
            {relativeDays(days)}
          </p>
        )}
      </div>
    </li>
  );
}
