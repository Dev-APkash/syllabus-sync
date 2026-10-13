"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const gradesSchema = z.object({
  courseId: z.uuid(),
  targetGrade: z.number().min(0).max(100).nullable(),
  scores: z
    .array(z.object({ id: z.uuid(), score: z.number().min(0, "Marks can't be negative.").max(150).nullable() }))
    .max(200),
});

/** Saves the student's marks (score_percent) and target grade (PLAN.md Task 6.2). */
export async function saveGrades(input: unknown): Promise<{ ok: boolean; message: string }> {
  const parsed = gradesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Some marks aren't valid." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };

  const supabase = await createClient();
  const { courseId, targetGrade, scores } = parsed.data;

  // RLS limits both updates to the student's own course and rows.
  const course = await supabase.from("courses").update({ target_grade: targetGrade }).eq("id", courseId).select("id");
  if (course.error || !course.data?.length) return { ok: false, message: "Couldn't save. Please try again." };

  for (const { id, score } of scores) {
    const { error } = await supabase
      .from("assessments")
      .update({ score_percent: score })
      .eq("id", id)
      .eq("course_id", courseId);
    if (error) return { ok: false, message: "Couldn't save your marks. Please try again." };
  }
  return { ok: true, message: "Marks saved." };
}
