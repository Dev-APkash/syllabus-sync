import Link from "next/link";
import { CourseDot } from "@/components/courses/course-dot";
import { KIND_LABELS, type AssessmentKind } from "@/lib/constants";
import { daysBetween, formatShortDate, relativeDays } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CourseInfo } from "./this-week";

export type ExamItem = {
  id: string;
  title: string;
  kind: string;
  due_date: string | null;
  weight_percent: number | null;
  course: CourseInfo;
};

/** The dashboard's side panel: every course's upcoming midterms, tests and finals, soonest first. */
export function ExamPanel({ exams, today }: { exams: ExamItem[]; today: string }) {
  return (
    <section aria-labelledby="exams" className="rounded-lg border bg-card">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
        <h2 id="exams" className="text-sm font-medium">
          Upcoming exams
        </h2>
        <span className="text-xs text-muted-foreground">Midterms, tests, finals</span>
      </div>
      {exams.length ? (
        <ul className="divide-y">
          {exams.map((exam) => (
            <ExamRow key={exam.id} exam={exam} today={today} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-muted-foreground">No upcoming midterms, tests or finals.</p>
      )}
    </section>
  );
}

function ExamRow({ exam, today }: { exam: ExamItem; today: string }) {
  const days = exam.due_date ? daysBetween(today, exam.due_date) : null;
  const soon = days !== null && days <= 7;
  return (
    <li className="relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <div
        className={cn(
          "flex w-12 shrink-0 flex-col items-center rounded-md border py-1 text-center leading-tight tabular-nums",
          soon && "border-warning/60 bg-warning/10",
        )}
      >
        {exam.due_date ? (
          <>
            <span className="text-[0.65rem] font-medium uppercase text-muted-foreground">
              {formatShortDate(exam.due_date).split(", ")[1].split(" ")[0]}
            </span>
            <span className="text-lg font-semibold">{Number(exam.due_date.slice(8))}</span>
          </>
        ) : (
          <span className="py-1.5 text-xs font-medium text-muted-foreground">TBA</span>
        )}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <Link
          href={`/courses/${exam.course.id}`}
          className="block truncate font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
          title={exam.title}
        >
          {exam.title}
        </Link>
        <p className="flex items-center gap-1.5 truncate text-xs tabular-nums text-muted-foreground">
          <CourseDot color={exam.course.color} className="h-2 w-2" />
          {exam.course.code ?? exam.course.name}
          {" · "}
          {KIND_LABELS[exam.kind as AssessmentKind] ?? "Exam"}
          {exam.weight_percent !== null && ` · ${exam.weight_percent}%`}
        </p>
        <p className={cn("mt-0.5 text-xs tabular-nums", soon ? "font-medium" : "text-muted-foreground")}>
          {days !== null ? relativeDays(days) : "Date not announced yet"}
        </p>
      </div>
    </li>
  );
}
