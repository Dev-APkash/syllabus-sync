"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { friendlyMessage } from "@/lib/friendly-error";
import { reviewPayloadSchema } from "@/lib/review/schema";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";

export type ActionResult = { ok: boolean; message: string };

/** Saves the course details and every row on the review screen. */
export async function saveReview(input: unknown): Promise<ActionResult> {
  const result = await save(input);
  return result.ok ? { ok: true, message: "Changes saved." } : result;
}

/** Saves, then publishes every row of this syllabus to the calendar feed. */
export async function confirmReview(input: unknown): Promise<ActionResult> {
  const result = await save(input);
  if (!result.ok || !result.courseId) return result;

  const supabase = await createClient();
  const { syllabusId } = reviewPayloadSchema.parse(input);
  const rows = await supabase.from("assessments").update({ status: "confirmed" }).eq("syllabus_id", syllabusId);
  const syllabus = await supabase
    .from("syllabi")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", syllabusId);
  if (rows.error || syllabus.error) return { ok: false, message: "Couldn't confirm. Please try again." };

  redirect(`/courses/${result.courseId}`);
}

async function save(input: unknown): Promise<ActionResult & { courseId?: string }> {
  const parsed = reviewPayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Some values aren't valid." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };

  const supabase = await createClient();
  const { syllabusId, course, rows } = parsed.data;

  // RLS: this only finds the syllabus if it belongs to the logged-in student.
  const { data: syllabus, error } = await supabase
    .from("syllabi")
    .select("id, course_id, status")
    .eq("id", syllabusId)
    .maybeSingle();
  if (error) return { ok: false, message: friendlyMessage(error.message, "Couldn't save. Please try again.") };
  if (!syllabus?.course_id) return { ok: false, message: "Syllabus not found." };
  const courseId = syllabus.course_id;

  const courseUpdate = await supabase
    .from("courses")
    .update({
      code: course.code || null,
      name: course.name,
      term: course.term || null,
      instructor: course.instructor || null,
      term_start_date: course.term_start_date || null,
    })
    .eq("id", courseId);
  if (courseUpdate.error) return { ok: false, message: "Couldn't save the course details." };

  // Rows that already exist for this syllabus. Any id not in this list is rejected.
  const { data: existing } = await supabase.from("assessments").select("id").eq("syllabus_id", syllabusId);
  const existingIds = new Set((existing ?? []).map((r) => r.id));
  if (rows.some((r) => r.id && !existingIds.has(r.id))) return { ok: false, message: "Some rows don't belong here." };

  const keptIds = new Set(rows.flatMap((r) => (r.id ? [r.id] : [])));
  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length) {
    const removed = await supabase.from("assessments").delete().in("id", toDelete);
    if (removed.error) return { ok: false, message: "Couldn't delete the removed rows." };
  }

  // Edits after confirming keep items confirmed (PLAN.md Task 4.4).
  const status = syllabus.status === "confirmed" ? "confirmed" : "draft";
  const upserts: TablesInsert<"assessments">[] = rows.map((r) => ({
    id: r.id ?? crypto.randomUUID(),
    course_id: courseId,
    syllabus_id: syllabusId,
    title: r.title,
    kind: r.kind,
    due_date: r.due_date || null,
    due_time: r.due_time || null,
    weight_percent: r.weight_percent,
    include_in_calendar: r.include_in_calendar,
    status,
  }));
  if (upserts.length) {
    // Columns not listed (source_quote, confidence, notes…) keep their saved values.
    const saved = await supabase.from("assessments").upsert(upserts, { onConflict: "id" });
    if (saved.error) return { ok: false, message: friendlyMessage(saved.error.message, "Couldn't save the rows.") };
  }
  return { ok: true, message: "Changes saved.", courseId };
}
