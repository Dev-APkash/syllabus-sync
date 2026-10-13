"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { SYLLABI_BUCKET } from "@/lib/constants";
import { friendlyMessage } from "@/lib/friendly-error";
import { createClient } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/timezone";

const timeZoneSchema = z.string().refine(isValidTimeZone, "Unknown time zone");

/** Saves the browser's time zone to the user's profile (PLAN.md Task 2.3). */
export async function saveTimezone(timeZone: string) {
  const parsed = timeZoneSchema.safeParse(timeZone);
  if (!parsed.success) return { ok: false };

  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ timezone: parsed.data }).eq("id", user.id);
  return { ok: !error };
}

// Only uploads that never produced deadlines can be removed from the course list.
const REMOVABLE = ["failed", "uploaded"];

/**
 * "Remove" on a failed upload: deletes its PDF, then its course (or just the syllabus if the
 * course has other uploads). Uses the student's own client, so RLS only allows their own rows
 * and files. Past readings stay in extraction_runs, so removing doesn't reset the daily limit.
 */
export async function removeUpload(syllabusId: unknown): Promise<{ ok: boolean; message: string }> {
  const id = z.uuid().safeParse(syllabusId);
  if (!id.success) return { ok: false, message: "Invalid request." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };

  const supabase = await createClient();
  const { data: syllabus, error } = await supabase
    .from("syllabi")
    .select("id, course_id, file_path, status")
    .eq("id", id.data)
    .maybeSingle();
  if (error) return { ok: false, message: friendlyMessage(error.message, "Couldn't remove it. Please try again.") };
  if (!syllabus) return { ok: false, message: "Upload not found." };
  if (!REMOVABLE.includes(syllabus.status)) {
    return { ok: false, message: "Only uploads that failed to read can be removed here." };
  }

  // 1. The PDF first (deleting rows doesn't delete files). A file that's already gone is fine.
  const file = await supabase.storage.from(SYLLABI_BUCKET).remove([syllabus.file_path]);
  if (file.error) return { ok: false, message: "Couldn't delete the PDF. Please try again." };

  // 2. The course if this was its only upload (its syllabus row goes with it), else just this upload.
  let onlyUpload = false;
  if (syllabus.course_id) {
    const { count } = await supabase
      .from("syllabi")
      .select("id", { count: "exact", head: true })
      .eq("course_id", syllabus.course_id);
    onlyUpload = count === 1;
  }
  const removed =
    onlyUpload && syllabus.course_id
      ? await supabase.from("courses").delete().eq("id", syllabus.course_id)
      : await supabase.from("syllabi").delete().eq("id", syllabus.id);
  if (removed.error) return { ok: false, message: "Couldn't remove it. Please try again." };

  return { ok: true, message: "Removed." };
}
