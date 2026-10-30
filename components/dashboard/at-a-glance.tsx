import { AlertCircle, CalendarClock, CalendarDays, GraduationCap } from "lucide-react";
import { daysBetween, formatShortDate, relativeDays } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ExamItem } from "./exam-panel";
import type { WeekItem } from "./this-week";

type Tone = "default" | "attention" | "danger" | "calm";

/** Four numbers across the top of the dashboard: the answer to "what's going on?" at a glance. */
export function AtAGlance({
  week,
  exams,
  pendingUploads,
  today,
}: {
  week: WeekItem[];
  exams: ExamItem[];
  /** Uploads waiting on the student (review, retry), not ones still being read. */
  pendingUploads: number;
  today: string;
}) {
  const dueToday = week.filter((i) => i.due_date === today);
  // Canvas knows when something is already handed in; those don't count as still due.
  const todayOpen = dueToday.filter((i) => i.canvasStatus !== "submitted" && i.canvasStatus !== "graded");
  const weekCourses = new Set(week.map((i) => i.course.id)).size;
  const missing = week.filter((i) => i.canvasStatus === "missing").length;
  const nextExam = exams.find((e) => e.due_date);
  const examDays = nextExam?.due_date ? daysBetween(today, nextExam.due_date) : null;
  const attention = pendingUploads + missing;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        icon={CalendarClock}
        label="Due today"
        value={todayOpen.length}
        detail={
          todayOpen.length
            ? [...new Set(todayOpen.map((i) => i.course.code ?? i.course.name))].join(", ")
            : dueToday.length
              ? "All handed in"
              : "Nothing due today"
        }
        tone={todayOpen.length ? "attention" : "calm"}
      />
      <Tile
        icon={CalendarDays}
        label="Next 7 days"
        value={week.length}
        detail={week.length ? `Across ${weekCourses} ${weekCourses === 1 ? "course" : "courses"}` : "A quiet week"}
      />
      <Tile
        icon={GraduationCap}
        label="Next exam"
        value={examDays !== null ? relativeDays(examDays) : "—"}
        detail={
          nextExam
            ? `${nextExam.course.code ?? nextExam.course.name} · ${formatShortDate(nextExam.due_date!)}`
            : "None scheduled"
        }
        tone={examDays !== null && examDays <= 7 ? "attention" : "default"}
      />
      <Tile
        icon={AlertCircle}
        label="Needs you"
        value={attention}
        detail={
          attention
            ? [
                pendingUploads && `${pendingUploads} ${pendingUploads === 1 ? "syllabus" : "syllabi"} to sort out`,
                missing && `${missing} missing in Canvas`,
              ]
                .filter(Boolean)
                .join(" · ")
            : "All caught up"
        }
        tone={missing ? "danger" : attention ? "attention" : "calm"}
      />
    </div>
  );
}

const TONES: Record<Tone, { box: string; icon: string }> = {
  default: { box: "", icon: "text-muted-foreground" },
  calm: { box: "", icon: "text-success" },
  attention: { box: "border-warning/50 bg-warning/5", icon: "text-warning" },
  danger: { box: "border-destructive/50 bg-destructive/5", icon: "text-destructive" },
};

function Tile({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  detail: string;
  tone?: Tone;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-lg border bg-card px-4 py-3", TONES[tone].box)}>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", TONES[tone].icon)} aria-hidden="true" />
        {label}
      </span>
      <span className="truncate font-serif text-2xl font-medium tabular-nums">{value}</span>
      <span className="truncate text-xs text-muted-foreground" title={detail}>
        {detail}
      </span>
    </div>
  );
}
