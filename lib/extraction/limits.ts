import { MAX_RUNS_PER_SYLLABUS } from "@/lib/constants";

/** Reads MAX_EXTRACTIONS_PER_DAY, falling back to 10 if it's missing or not a number. */
export function maxExtractionsPerDay(value = process.env.MAX_EXTRACTIONS_PER_DAY): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 10;
}

/** EXTRACTION_ENABLED=false is the kill switch that pauses all AI calls instantly. */
export function extractionEnabled(value = process.env.EXTRACTION_ENABLED): boolean {
  return value?.trim().toLowerCase() !== "false";
}

export type BeginExtractionResult = "ok" | "not_found" | "already_done" | "busy" | "syllabus_limit" | "daily_limit";

/**
 * Turns the answer from the database function begin_extraction
 * (supabase/migrations/0003) into an HTTP status and a friendly message.
 * The limits themselves are enforced inside the database, so they hold even
 * when many requests arrive at the same moment (PLAN.md Task 7.2).
 */
export function describeBeginResult(
  result: string | null,
  maxPerDay: number,
): { status: number; message: string } | null {
  switch (result as BeginExtractionResult) {
    case "ok":
      return null;
    case "already_done":
      return { status: 200, message: "Already read." };
    case "busy":
      return { status: 409, message: "This syllabus is being read right now. Give it a minute, then refresh." };
    case "syllabus_limit":
      return {
        status: 429,
        message: `This syllabus has already been read ${MAX_RUNS_PER_SYLLABUS} times. Please check the results on the review screen, or add the deadlines by hand.`,
      };
    case "daily_limit":
      return {
        status: 429,
        message: `You've reached today's limit of ${maxPerDay} syllabus readings. Please try again tomorrow.`,
      };
    case "not_found":
      return { status: 404, message: "Syllabus not found." };
    default:
      return { status: 503, message: "Couldn't start reading this syllabus. Please try again." };
  }
}
