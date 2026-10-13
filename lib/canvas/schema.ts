import { z } from "zod";

// What the student types in Settings, and the parts of Canvas's API answers we use
// (https://canvas.instructure.com/doc/api/). Unknown fields are dropped by Zod.

/** A Canvas personal access token, e.g. "1234~AbC…". */
export const canvasTokenSchema = z
  .string()
  .trim()
  .min(20, "That doesn't look like a whole Canvas token. Copy it again.")
  .max(300, "That doesn't look like a Canvas token.")
  .regex(/^[A-Za-z0-9~._-]+$/, "That doesn't look like a Canvas token. Copy just the token itself.");

/**
 * "learn.school.edu", "https://learn.school.edu/courses/12" → "https://learn.school.edu".
 * Only public https addresses with a domain name, never an IP address or an internal name:
 * the server fetches this address, so it must not be pointed at machines on its own network.
 */
export function normalizeCanvasUrl(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw || raw.length > 200) return null;
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname;
  if (url.protocol !== "https:" || url.port !== "" || url.username || url.password) return null;
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.startsWith("[")) return null;
  if (/\.(local|localhost|internal|lan|home|ts\.net)$/.test(host)) return null;
  return `https://${host}`;
}

/** The address of the next page from Canvas's Link header, if there is one. */
export function nextPageUrl(linkHeader: string | null): string | null {
  for (const part of linkHeader?.split(",") ?? []) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

export const canvasUserSchema = z.object({ id: z.number(), name: z.string() });

export const canvasCourseSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  course_code: z.string().optional(),
  enrollments: z
    .array(
      z.object({
        type: z.string(),
        computed_current_score: z.number().nullish(),
        computed_current_grade: z.string().nullish(),
      }),
    )
    .optional(),
});

export const canvasAssignmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  due_at: z.string().nullable(),
  points_possible: z.number().nullish(),
  html_url: z.string(),
  submission: z
    .object({
      score: z.number().nullish(),
      grade: z.string().nullish(),
      workflow_state: z.string(),
      submitted_at: z.string().nullish(),
      graded_at: z.string().nullish(),
      missing: z.boolean().nullish(),
      excused: z.boolean().nullish(),
    })
    .nullish(),
});

/** One item from GET /api/v1/planner/items (everything due across the student's courses). */
export const plannerItemSchema = z.object({
  course_id: z.number().nullish(),
  plannable_id: z.number(),
  plannable_type: z.string(),
  plannable_date: z.string(),
  html_url: z.string().nullish(),
  plannable: z.object({
    title: z.string().optional(),
    due_at: z.string().nullish(),
  }),
  // Canvas sends `false` when the item takes no submissions.
  submissions: z
    .union([
      z.literal(false),
      z.object({
        submitted: z.boolean().nullish(),
        excused: z.boolean().nullish(),
        graded: z.boolean().nullish(),
        missing: z.boolean().nullish(),
      }),
    ])
    .nullish(),
});

export type PlannerItem = z.infer<typeof plannerItemSchema>;
export type CanvasCourse = z.infer<typeof canvasCourseSchema>;
export type CanvasAssignment = z.infer<typeof canvasAssignmentSchema>;

/** Keeps the items that match the schema, so one odd item doesn't hide all the others. */
export function parseList<T>(schema: z.ZodType<T>, items: unknown[]): T[] {
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
