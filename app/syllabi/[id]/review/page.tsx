import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";

export const metadata = { title: "Review" };
import { ReviewEditor } from "@/components/review/review-editor";
import type { EditableRow } from "@/components/review/types";
import { ASSESSMENT_KINDS, SYLLABI_BUCKET, type AssessmentKind } from "@/lib/constants";
import { extractionOutputSchema } from "@/lib/extraction/schema";
import { requireUser } from "@/lib/auth";
import { toPublicUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default function ReviewPage({ params }: PageProps<"/syllabi/[id]/review">) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <Review params={params} />
    </Suspense>
  );
}

async function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  await requireUser();
  const supabase = await createClient();

  // RLS: another student's syllabus simply isn't found → 404.
  const { data: syllabus, error } = await supabase
    .from("syllabi")
    .select(
      "id, status, file_path, original_filename, raw_extraction, course_id, courses(id, code, name, term, instructor, term_start_date)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!syllabus?.courses) notFound();

  const [{ data: assessments }, signed] = await Promise.all([
    supabase
      .from("assessments")
      .select(
        "id, title, kind, due_date, due_time, weight_percent, include_in_calendar, confidence, source_quote, date_text, notes",
      )
      .eq("syllabus_id", id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    // A private link to the PDF that stops working after 10 minutes.
    supabase.storage.from(SYLLABI_BUCKET).createSignedUrl(syllabus.file_path, 600),
  ]);

  const course = syllabus.courses;
  const raw = extractionOutputSchema.safeParse(syllabus.raw_extraction);
  const rows: EditableRow[] = (assessments ?? []).map((a) => ({
    key: a.id,
    id: a.id,
    title: a.title,
    kind: (ASSESSMENT_KINDS as readonly string[]).includes(a.kind) ? (a.kind as AssessmentKind) : "other",
    due_date: a.due_date ?? "",
    due_time: a.due_time ? a.due_time.slice(0, 5) : "",
    weight: a.weight_percent === null ? "" : String(a.weight_percent),
    include_in_calendar: a.include_in_calendar,
    confidence: a.confidence,
    source_quote: a.source_quote ?? "",
    date_text: a.date_text ?? "",
    notes: a.notes ?? "",
  }));
  const confirmed = syllabus.status === "confirmed";
  // Made on the server, so swap any internal Docker address for the public one.
  const pdfUrl = signed.data?.signedUrl ? toPublicUrl(signed.data.signedUrl) : null;

  return (
    // Wider than other pages so the table and the PDF fit side by side:
    // a centred flex item may be wider than <main> and overflows evenly on both sides.
    <div className="flex w-[min(calc(100vw-2rem),96rem)] flex-col gap-8 self-center sm:w-[min(calc(100vw-3rem),96rem)]">
      <PageHeader
        back={confirmed ? { href: `/courses/${course.id}`, label: "Course" } : { href: "/dashboard", label: "Courses" }}
        title={confirmed ? "Edit deadlines" : "Review and confirm"}
        description={
          confirmed
            ? "Changes you save here update your calendar feed."
            : "Check each row against the syllabus. Highlighted rows need a closer look. Nothing reaches your calendar until you confirm."
        }
      />

      {/* Editor first, so on phones the PDF sits below it; side by side on wide screens. */}
      <div className="-mt-4 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,34%)]">
        <ReviewEditor
          syllabusId={syllabus.id}
          confirmed={confirmed}
          initialCourse={{
            code: course.code ?? "",
            name: course.name,
            term: course.term ?? "",
            instructor: course.instructor ?? "",
            term_start_date: course.term_start_date ?? "",
          }}
          initialRows={rows}
          gradingNotes={raw.success ? raw.data.grading_notes : []}
          warnings={raw.success ? raw.data.warnings : []}
        />
        <aside className="flex flex-col gap-2 xl:sticky xl:top-20 xl:self-start">
          {pdfUrl ? (
            <>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-muted-foreground">{syllabus.original_filename}</span>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  Open in new tab
                </a>
              </div>
              <iframe
                src={pdfUrl}
                title={`Syllabus: ${syllabus.original_filename}`}
                className="hidden h-[78vh] w-full rounded-lg border bg-card md:block"
              />
            </>
          ) : (
            <p className="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground">
              The original PDF isn&apos;t available (it may have been deleted).
            </p>
          )}
        </aside>
      </div>
      <FeedbackForm syllabusId={syllabus.id} />
    </div>
  );
}
