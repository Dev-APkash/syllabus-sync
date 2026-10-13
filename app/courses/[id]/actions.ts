"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { COURSE_COLORS, SYLLABI_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

/**
 * "Delete the PDF" (PLAN.md Task 7.3): removes the file from storage but keeps
 * the confirmed dates. Uses the student's own client, so storage RLS only
 * allows deleting files in their own folder.
 */
export async function deletePdf(syllabusId: unknown): Promise<{ ok: boolean; message: string }> {
  const id = z.uuid().safeParse(syllabusId);
  if (!id.success) return { ok: false, message: "Invalid request." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };

  const supabase = await createClient();
  const { data: syllabus } = await supabase
    .from("syllabi")
    .select("file_path, course_id")
    .eq("id", id.data)
    .maybeSingle();
  if (!syllabus) return { ok: false, message: "Syllabus not found." };

  const { error } = await supabase.storage.from(SYLLABI_BUCKET).remove([syllabus.file_path]);
  if (error) return { ok: false, message: "Couldn't delete the PDF. Please try again." };

  revalidatePath(`/courses/${syllabus.course_id}`);
  return { ok: true, message: "PDF deleted. Your deadlines are still here." };
}

const doneSchema = z.object({ assessmentId: z.uuid(), done: z.boolean() });

/** Ticks a deadline off (or back on). RLS: own deadlines only. */
export async function setDone(input: unknown): Promise<{ ok: boolean; message: string }> {
  const parsed = doneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessments")
    .update({ completed_at: parsed.data.done ? new Date().toISOString() : null })
    .eq("id", parsed.data.assessmentId)
    .select("course_id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Couldn't save that. Please try again." };
  revalidatePath(`/courses/${data.course_id}`);
  return { ok: true, message: parsed.data.done ? "Marked as done." : "Marked as not done." };
}

/**
 * Deletes a course: its PDFs first (rows don't delete files), then the course. Its syllabi and
 * deadlines go with it ("on delete cascade"), so they also leave the calendar feed. Readings stay
 * in extraction_runs, so deleting doesn't reset the daily limit.
 */
export async function deleteCourse(courseId: unknown): Promise<{ ok: boolean; message: string }> {
  const id = z.uuid().safeParse(courseId);
  if (!id.success) return { ok: false, message: "Invalid request." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, syllabi(file_path)")
    .eq("id", id.data)
    .maybeSingle();
  if (!course) return { ok: false, message: "Course not found." };

  const files = course.syllabi.map((s) => s.file_path);
  if (files.length) {
    const removed = await supabase.storage.from(SYLLABI_BUCKET).remove(files);
    if (removed.error) return { ok: false, message: "Couldn't delete the PDFs. Please try again." };
  }
  const { error } = await supabase.from("courses").delete().eq("id", id.data);
  if (error) return { ok: false, message: "Couldn't delete the course. Please try again." };
  redirect("/dashboard");
}

const colorSchema = z.object({ courseId: z.uuid(), color: z.enum(COURSE_COLORS) });

/** Sets a course's colour (one of COURSE_COLORS). RLS: own courses only. */
export async function setCourseColor(input: unknown): Promise<{ ok: boolean; message: string }> {
  const parsed = colorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid colour." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };

  const supabase = await createClient();
  const { error } = await supabase.from("courses").update({ color: parsed.data.color }).eq("id", parsed.data.courseId);
  if (error) return { ok: false, message: "Couldn't change the colour. Please try again." };
  revalidatePath(`/courses/${parsed.data.courseId}`);
  return { ok: true, message: "Colour changed." };
}

const linkSchema = z.object({ courseId: z.uuid(), canvasCourseId: z.number().int().positive().nullable() });

/** Remembers which Canvas course this course is (null = choose again). RLS: own courses only. */
export async function linkCanvasCourse(input: unknown): Promise<{ ok: boolean; message: string }> {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ canvas_course_id: parsed.data.canvasCourseId })
    .eq("id", parsed.data.courseId);
  if (error) return { ok: false, message: "Couldn't save. Please try again." };
  revalidatePath(`/courses/${parsed.data.courseId}`);
  return { ok: true, message: "Saved." };
}
