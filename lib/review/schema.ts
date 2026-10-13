import { z } from "zod";
import { ASSESSMENT_KINDS } from "@/lib/constants";

// What the review screen sends when the student saves or confirms (PLAN.md Task 4.1).
// Checked again on the server: never trust what a browser sends.

const optionalText = (max: number) => z.string().trim().max(max);

export const reviewRowSchema = z.object({
  id: z.uuid().optional(), // missing = a row the student added
  title: z.string().trim().min(1, "Every row needs a title.").max(200),
  kind: z.enum(ASSESSMENT_KINDS),
  due_date: z.union([z.iso.date(), z.literal("")]),
  due_time: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/), z.literal("")]),
  weight_percent: z.number().min(0, "Weights can't be negative.").max(100, "A weight can't be over 100%.").nullable(),
  include_in_calendar: z.boolean(),
});

export const reviewCourseSchema = z.object({
  code: optionalText(40),
  name: z.string().trim().min(1, "The course needs a name.").max(200),
  term: optionalText(40),
  instructor: optionalText(200),
  term_start_date: z.union([z.iso.date(), z.literal("")]),
});

export const reviewPayloadSchema = z.object({
  syllabusId: z.uuid(),
  course: reviewCourseSchema,
  rows: z.array(reviewRowSchema).max(200),
});

export type ReviewRow = z.infer<typeof reviewRowSchema>;
export type ReviewCourse = z.infer<typeof reviewCourseSchema>;
export type ReviewPayload = z.infer<typeof reviewPayloadSchema>;
