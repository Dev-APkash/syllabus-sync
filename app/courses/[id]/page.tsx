import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CanvasPanel } from "@/components/canvas/canvas-panel";
import { ColorPicker } from "@/components/courses/color-picker";
import { DeleteCourseButton } from "@/components/courses/delete-course-button";
import { CourseDot, toCourseColor } from "@/components/courses/course-dot";
import { DeletePdfButton } from "@/components/courses/delete-pdf-button";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { DeadlineList } from "@/components/courses/deadline-list";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";

export const metadata = { title: "Course" };
import { SYLLABI_BUCKET } from "@/lib/constants";
import { todayInTimeZone } from "@/lib/dates";
import { isDone, splitDeadlines, weightStillToCome } from "@/lib/deadlines";
import { weightTotal as sumWeights } from "@/lib/review/checks";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default function CoursePage({ params }: PageProps<"/courses/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <Course params={params} />
    </Suspense>
  );
}

async function Course({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: course, error }, { data: items }, { data: profile }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, code, name, term, instructor, color, canvas_course_id, syllabi(id, file_path, status, created_at)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("assessments")
      .select("id, title, kind, due_date, due_time, weight_percent, include_in_calendar, completed_at")
      .eq("course_id", id)
      .eq("status", "confirmed"),
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (!course) notFound();

  // "Upcoming" means from today on where the student is (the server's clock is UTC).
  const today = todayInTimeZone(profile?.timezone ?? "UTC");
  const split = splitDeadlines(items ?? [], today);
  const upcomingCount = [...split.next, ...split.later].filter((i) => !isDone(i)).length;

  const syllabus = [...course.syllabi].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  // Does the PDF still exist? (It's gone after "Delete the PDF".)
  const pdfExists = syllabus
    ? !(await supabase.storage.from(SYLLABI_BUCKET).createSignedUrl(syllabus.file_path, 60)).error
    : false;
  const weightTotal = sumWeights(
    (items ?? []).map((i) => ({ title: i.title, due_date: i.due_date ?? "", weight_percent: i.weight_percent })),
  );
  // Canvas answers in a second or two; stream it in so the rest of the page doesn't wait.
  const canvasPanel = (
    <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
      <CanvasPanel
        userId={user.id}
        courseId={course.id}
        courseCode={course.code}
        canvasCourseId={course.canvas_course_id}
        timeZone={profile?.timezone ?? "UTC"}
      />
    </Suspense>
  );

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard", label: "Courses" }}
        title={
          <>
            <CourseDot color={course.color} className="mr-3 h-3 w-3 align-middle" />
            {course.code && <span className="tabular-nums">{course.code} </span>}
            <span className={course.code ? "text-muted-foreground" : undefined}>{course.name}</span>
          </>
        }
        description={[course.term, course.instructor].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            {syllabus && (
              <Button asChild variant="outline">
                <Link href={`/syllabi/${syllabus.id}/review`}>Edit deadlines</Link>
              </Button>
            )}
            <Button asChild>
              <Link href={`/courses/${course.id}/grades`}>Grade calculator</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
        {!items?.length ? (
          <div className="flex flex-col gap-8">
            <p className="rounded-lg border border-dashed bg-card p-8 text-muted-foreground">
              No confirmed deadlines yet.
              {syllabus?.status === "needs_review" && " Review and confirm your syllabus to add them here."}
            </p>
            {canvasPanel}
          </div>
        ) : (
          <DeadlineList split={split} today={today} afterNextUp={canvasPanel} />
        )}

        <aside className="flex flex-col gap-6 text-sm">
          {items && items.length > 0 && (
            <div className="flex flex-col gap-3 border-b pb-6">
              <dl className="grid grid-cols-2 gap-4 tabular-nums lg:grid-cols-1">
                <div>
                  <dt className="text-muted-foreground">Coming up</dt>
                  <dd className="font-serif text-2xl">
                    {upcomingCount} <span className="font-sans text-sm text-muted-foreground">of {items.length}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Still to come</dt>
                  <dd className="font-serif text-2xl">
                    {weightStillToCome(items, today)}%{" "}
                    <span className="font-sans text-sm text-muted-foreground">of your grade</span>
                  </dd>
                </div>
              </dl>
              {Math.abs(weightTotal - 100) >= 0.01 && (
                <p className="text-muted-foreground">
                  The weights add up to {weightTotal}%, not 100%. Use Edit deadlines to fix them.
                </p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-3 border-b pb-6">
            <p className="text-muted-foreground">Course colour</p>
            <ColorPicker courseId={course.id} current={toCourseColor(course.color)} />
          </div>
          {syllabus && pdfExists && (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground">
                Finished checking? You can delete the uploaded PDF and keep the dates.
              </p>
              <DeletePdfButton syllabusId={syllabus.id} />
            </div>
          )}
          <FeedbackForm syllabusId={syllabus?.id} />
          <div className="flex flex-col gap-3 border-t pt-6">
            <p className="text-muted-foreground">Dropped this course? Delete it with its deadlines.</p>
            <DeleteCourseButton courseId={course.id} label={course.code ?? course.name} />
          </div>
        </aside>
      </div>
    </>
  );
}
