"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const feedbackSchema = z.object({
  message: z.string().trim().min(1, "Please write a message.").max(2000, "Please keep it under 2,000 characters."),
  page: z.string().max(200),
  syllabusId: z.uuid().nullable(), // only when the student ticked "include this syllabus"
});

/** Saves a "Something wrong? Tell us" message (PLAN.md Task 7.6). */
export async function sendFeedback(input: unknown): Promise<{ ok: boolean; message: string }> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid feedback." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({
    message: parsed.data.message,
    page: parsed.data.page,
    syllabus_id: parsed.data.syllabusId,
  });
  return error
    ? { ok: false, message: "Couldn't send. Please try again." }
    : { ok: true, message: "Thanks! We got it." };
}
