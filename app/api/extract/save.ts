import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toAssessmentRows, type ExtractionOutput } from "@/lib/extraction/schema";
import type { Database } from "@/types/database";

/**
 * Saves a successful extraction with the student's own client (so RLS applies):
 * fills in blank course fields, replaces any earlier draft rows, and moves the
 * syllabus to "needs_review".
 */
export async function saveExtraction(
  supabase: SupabaseClient<Database>,
  input: { syllabusId: string; courseId: string; data: ExtractionOutput },
): Promise<{ ok: boolean }> {
  const { syllabusId, courseId, data } = input;

  // Only fill fields the student left blank; never overwrite what they typed.
  const { data: course } = await supabase
    .from("courses")
    .select("code, name, instructor, term")
    .eq("id", courseId)
    .maybeSingle();
  if (course) {
    const updates: Database["public"]["Tables"]["courses"]["Update"] = {};
    if (!course.code && data.course.code) updates.code = data.course.code.slice(0, 40);
    if ((!course.name || course.name === "Untitled course") && data.course.name) {
      updates.name = data.course.name.slice(0, 200);
    }
    if (!course.instructor && data.course.instructor) updates.instructor = data.course.instructor.slice(0, 200);
    if (!course.term && data.course.term) updates.term = data.course.term.slice(0, 40);
    if (Object.keys(updates).length) await supabase.from("courses").update(updates).eq("id", courseId);
  }

  // A retry replaces the previous drafts instead of duplicating them.
  const removed = await supabase.from("assessments").delete().eq("syllabus_id", syllabusId).eq("status", "draft");
  if (removed.error) return { ok: false };

  const rows = toAssessmentRows(data, { courseId, syllabusId });
  if (rows.length) {
    const inserted = await supabase.from("assessments").insert(rows);
    if (inserted.error) return { ok: false };
  }

  const updated = await supabase
    .from("syllabi")
    .update({
      status: "needs_review",
      raw_extraction: data,
      extracted_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", syllabusId);
  return { ok: !updated.error };
}
