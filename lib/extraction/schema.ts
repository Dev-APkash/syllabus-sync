import { z } from "zod";
import { ASSESSMENT_KINDS, CONFIDENCE_LEVELS } from "@/lib/constants";
import type { TablesInsert } from "@/types/database";

// The shape Claude must return (PLAN.md section 5, step 4). Every field is
// required and none are nullable: structured outputs limit how many optional
// fields a schema may have, so "" and -1 mean "unknown" and become null later.
export const assessmentOutputSchema = z.object({
  title: z.string(),
  kind: z.enum(ASSESSMENT_KINDS),
  due_date: z.string().describe('"YYYY-MM-DD", or "" if unknown / TBA'),
  due_time: z.string().describe('"HH:MM" 24-hour, or "" for no specific time'),
  date_text: z.string().describe("The date exactly as the syllabus wrote it"),
  weight_percent: z.number().describe("Percent of the final grade, or -1 if unknown"),
  source_quote: z.string().describe("Shortest exact supporting phrase, under 30 words"),
  confidence: z.enum(CONFIDENCE_LEVELS),
  notes: z.string(),
});

export const extractionOutputSchema = z.object({
  course: z.object({
    code: z.string(),
    name: z.string(),
    instructor: z.string(),
    term: z.string(),
  }),
  assessments: z.array(assessmentOutputSchema),
  grading_notes: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;
export type AssessmentOutput = z.infer<typeof assessmentOutputSchema>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Cleans up Claude's raw JSON before validation: lower-cases the enum values
 * (the API doesn't guarantee their capitalisation), trims text, and blanks out
 * any date, time or weight that isn't valid (adding a warning) rather than
 * failing the whole syllabus over one bad value.
 */
export function normalizeExtraction(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const data = raw as Record<string, unknown>;
  const warnings = Array.isArray(data.warnings) ? [...(data.warnings as unknown[])] : [];
  const assessments = Array.isArray(data.assessments) ? data.assessments : [];

  const cleaned = assessments.map((item: unknown) => {
    if (!item || typeof item !== "object") return item;
    const a = { ...(item as Record<string, unknown>) };
    for (const key of ["title", "date_text", "source_quote", "notes", "due_date", "due_time"]) {
      if (typeof a[key] === "string") a[key] = (a[key] as string).trim();
    }
    if (typeof a.kind === "string") a.kind = a.kind.toLowerCase().replace(/\s+/g, "_");
    if (typeof a.confidence === "string") a.confidence = a.confidence.toLowerCase();
    if (typeof a.due_time === "string" && /^\d{2}:\d{2}:\d{2}$/.test(a.due_time)) {
      a.due_time = a.due_time.slice(0, 5);
    }
    if (typeof a.due_date === "string" && a.due_date !== "" && !isRealDate(a.due_date)) {
      warnings.push(`"${a.title}": the date "${a.due_date}" wasn't valid, so it was left blank.`);
      a.due_date = "";
      a.confidence = "low";
    }
    if (typeof a.due_time === "string" && a.due_time !== "" && !TIME_RE.test(a.due_time)) {
      a.due_time = "";
    }
    if (typeof a.weight_percent === "number" && (a.weight_percent > 100 || a.weight_percent < -1)) {
      warnings.push(`"${a.title}": the weight ${a.weight_percent}% wasn't valid, so it was left blank.`);
      a.weight_percent = -1;
    }
    return a;
  });

  return { ...data, assessments: cleaned, warnings };
}

/** Converts a validated extraction into draft rows for the assessments table. */
export function toAssessmentRows(
  output: ExtractionOutput,
  ids: { courseId: string; syllabusId: string },
): TablesInsert<"assessments">[] {
  return output.assessments
    .filter((a) => a.title.trim() !== "")
    .map((a) => ({
      course_id: ids.courseId,
      syllabus_id: ids.syllabusId,
      title: a.title.trim().slice(0, 200),
      kind: a.kind,
      due_date: a.due_date || null,
      due_time: a.due_time || null,
      weight_percent: a.weight_percent < 0 ? null : a.weight_percent,
      date_text: a.date_text || null,
      source_quote: a.source_quote ? a.source_quote.slice(0, 500) : null,
      confidence: a.confidence,
      notes: a.notes || null,
      include_in_calendar: true,
      status: "draft", // AI results are ALWAYS drafts until the student confirms
    }));
}
