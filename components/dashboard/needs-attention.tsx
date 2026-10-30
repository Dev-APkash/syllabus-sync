import Link from "next/link";
import { CourseDot } from "@/components/courses/course-dot";
import { Button } from "@/components/ui/button";
import type { DashboardCourse } from "./course-list";
import { RemoveUploadButton } from "./remove-upload-button";
import { RetryButton } from "./retry-button";
import { StatusBadge } from "./status-badge";

export type PendingUpload = { course: DashboardCourse; syllabus: DashboardCourse["syllabi"][number] };

// What each status means for the student, in their words.
const EXPLAIN: Record<string, string> = {
  needs_review: "Ready for you to check. Confirm the deadlines we found to add them to your calendar.",
  extracting: "Reading the syllabus. This usually takes 1–3 minutes.",
  uploaded: "Uploaded, but not read yet.",
  failed: "We couldn't read this syllabus.",
};

// Things to do first, things still running last.
const ORDER = ["needs_review", "failed", "uploaded", "extracting"];

/** Uploads that aren't confirmed courses yet, each with what's going on and what to do. */
export function NeedsAttention({ uploads }: { uploads: PendingUpload[] }) {
  if (!uploads.length) return null;
  const sorted = [...uploads].sort((a, b) => ORDER.indexOf(a.syllabus.status) - ORDER.indexOf(b.syllabus.status));
  return (
    <section aria-labelledby="needs-attention">
      <h2 id="needs-attention" className="mb-2 text-sm font-medium">
        Needs your attention
      </h2>
      <ul className="divide-y rounded-lg border border-warning/40 bg-card">
        {sorted.map(({ course, syllabus }) => (
          <li
            key={syllabus.id}
            className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <CourseDot color={course.color} className="mt-1.5" />
              <div className="min-w-0">
                <p className="truncate font-medium">{course.code ? `${course.code} · ${course.name}` : course.name}</p>
                <p className="truncate text-xs text-muted-foreground" title={syllabus.original_filename}>
                  {syllabus.original_filename}
                </p>
                <div className="mt-1.5 flex flex-col gap-0.5 text-sm">
                  <StatusBadge status={syllabus.status} />
                  <p className="text-muted-foreground">{EXPLAIN[syllabus.status] ?? EXPLAIN.uploaded}</p>
                  {syllabus.status === "failed" && syllabus.error_message && (
                    <p className="line-clamp-2 text-destructive">{syllabus.error_message}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-start gap-2 pl-5 sm:pl-0">
              <SyllabusAction syllabusId={syllabus.id} status={syllabus.status} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SyllabusAction({ syllabusId, status }: { syllabusId: string; status: string }) {
  switch (status) {
    case "needs_review":
      return (
        <Button asChild size="sm">
          <Link href={`/syllabi/${syllabusId}/review`}>Review deadlines</Link>
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
