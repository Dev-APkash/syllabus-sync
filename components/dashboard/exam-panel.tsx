import Link from "next/link";
import { CourseDot } from "@/components/courses/course-dot";
import { KIND_LABELS, type AssessmentKind } from "@/lib/constants";
import { daysBetween, formatShortDate, relativeDays } from "@/lib/dates";
import type { CourseInfo } from "./this-week";

export type ExamItem = {
  id: string;
  title: string;
  kind: string;
  due_date: string | null;
  weight_percent: number | null;
};
export type ExamGroup = { course: CourseInfo; exams: ExamItem[] };

/** The dashboard's side panel: every course's upcoming midterms, tests and final in one place. */
export function ExamPanel({ groups, today }: { groups: ExamGroup[]; today: string }) {
  return (
    <section aria-labelledby="exams" className="rounded-lg border bg-card">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
        <h2 id="exams" className="text-sm font-medium">
          Exams
        </h2>
        <span className="text-xs text-muted-foreground">Midterms, tests, finals</span>
      </div>
      {groups.length ? (
        <div className="divide-y">
          {groups.map(({ course, exams }) => (
            <div key={course.id} className="px-4 py-3">
              <Link
                href={`/courses/${course.id}`}
                className="flex w-fit items-center gap-2 text-sm font-medium tabular-nums underline-offset-4 hover:underline"
              >
                <CourseDot color={course.color} />
                {course.code ?? course.name}
              </Link>
              <ul className="mt-2 flex flex-col gap-2">
                {exams.map((exam) => (
                  <li key={exam.id} className="text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate" title={exam.title}>
                        {exam.title}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {exam.due_date ? formatShortDate(exam.due_date) : "TBA"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {KIND_LABELS[exam.kind as AssessmentKind] ?? "Exam"}
                        {exam.weight_percent !== null && ` · ${exam.weight_percent}%`}
                      </span>
                      {exam.due_date && (
                        <span className="tabular-nums">{relativeDays(daysBetween(today, exam.due_date))}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-sm text-muted-foreground">No upcoming midterms, tests or finals.</p>
      )}
    </section>
  );
}
