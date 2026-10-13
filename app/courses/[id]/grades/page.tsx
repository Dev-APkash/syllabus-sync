import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";

export const metadata = { title: "Grade calculator" };
import { GradeCalculator, type CalculatorItem } from "@/components/grades/grade-calculator";
import { requireUser } from "@/lib/auth";
import { canvasGet, canvasGetAll, getCanvasConnection } from "@/lib/canvas/api";
import { canvasAssignmentSchema, canvasCourseSchema, parseList } from "@/lib/canvas/schema";
import { currentScore, matchCanvasMarks } from "@/lib/canvas/summary";
import { createClient } from "@/lib/supabase/server";

export default function GradesPage({ params }: PageProps<"/courses/[id]/grades">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Grades params={params} />
    </Suspense>
  );
}

async function Grades({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requireUser();
  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select("id, code, name, target_grade, canvas_course_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!course) notFound();

  const { data: rows } = await supabase
    .from("assessments")
    .select("id, title, kind, weight_percent, score_percent")
    .eq("course_id", id)
    .eq("status", "confirmed")
    .gt("weight_percent", 0)
    .order("due_date", { ascending: true, nullsFirst: false });

  const items: CalculatorItem[] = (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    weight_percent: r.weight_percent ?? 0,
    score_percent: r.score_percent,
  }));
  // Default "final" = the item typed final_exam, otherwise the heaviest one.
  const final =
    rows?.find((r) => r.kind === "final_exam") ??
    [...(rows ?? [])].sort((a, b) => (b.weight_percent ?? 0) - (a.weight_percent ?? 0))[0];
  const canvas = await loadCanvasMarks(supabase, user.id, course.canvas_course_id, items);

  return (
    <>
      <PageHeader
        back={{ href: `/courses/${course.id}`, label: course.code ?? course.name }}
        title="What do I need on the final?"
        description="Enter the marks you've received. The answer updates as you type, using the weights from your syllabus."
      />
      {!items.length || !final ? (
        <p className="rounded-lg border border-dashed bg-card p-8 text-muted-foreground">
          No weighted items yet. Confirm your syllabus and make sure items have weights, then come back.
        </p>
      ) : (
        <GradeCalculator
          courseId={course.id}
          items={items}
          defaultFinalId={final.id}
          initialTarget={course.target_grade}
          canvasMarks={canvas?.marks ?? {}}
          canvasCurrent={canvas?.current ?? null}
        />
      )}
    </>
  );
}

/** Marks from Canvas for this course's items (matched by name), or null if Canvas isn't linked or reachable. */
async function loadCanvasMarks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  canvasCourseId: number | null,
  items: { id: string; title: string }[],
): Promise<{ marks: Record<string, number>; current: number | null } | null> {
  if (!canvasCourseId) return null;
  const conn = await getCanvasConnection(supabase, userId);
  if ("error" in conn) return null;
  try {
    const base = `/api/v1/courses/${canvasCourseId}`;
    const [course, assignments] = await Promise.all([
      canvasGet(conn, `${base}?include[]=total_scores`),
      canvasGetAll(conn, `${base}/assignments?include[]=submission&per_page=100`),
    ]);
    const parsed = canvasCourseSchema.safeParse(course);
    return {
      marks: matchCanvasMarks(items, parseList(canvasAssignmentSchema, assignments)),
      current: parsed.success ? currentScore(parsed.data).score : null,
    };
  } catch {
    return null; // the calculator still works with typed marks
  }
}
