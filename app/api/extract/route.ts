import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { MAX_PDF_PAGES, SYLLABI_BUCKET } from "@/lib/constants";
import { extractSyllabus } from "@/lib/extraction/extract";
import { describeBeginResult, extractionEnabled, maxExtractionsPerDay } from "@/lib/extraction/limits";
import { extractionOutputSchema } from "@/lib/extraction/schema";
import { friendlyMessage } from "@/lib/friendly-error";
import { inspectPdf } from "@/lib/pdf/inspect-pdf";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { saveExtraction } from "./save";

// Claude can take up to a few minutes on a long syllabus (Vercel Hobby allows 300 s).
export const maxDuration = 300;

const bodySchema = z.object({ syllabusId: z.uuid() });

function reply(status: number, message: string) {
  return Response.json({ ok: status < 400, message }, { status });
}

type Job = {
  supabase: SupabaseClient<Database>;
  userId: string;
  syllabusId: string;
  courseId: string;
  filePath: string;
  term: string | null;
  termStartDate: string | null;
};

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return reply(400, "Invalid request.");

  const user = await getCurrentUser();
  if (!user) return reply(401, "Please log in again.");

  if (!extractionEnabled()) {
    return reply(503, "Syllabus reading is temporarily paused. Your file is saved; please try again later.");
  }

  const supabase = await createClient();
  const { syllabusId } = body.data;

  // Load with the student's own client: RLS returns nothing if it isn't theirs.
  const { data: syllabus, error: loadError } = await supabase
    .from("syllabi")
    .select("id, status, file_path, file_sha256, course_id, courses(term, term_start_date)")
    .eq("id", syllabusId)
    .maybeSingle();
  if (loadError) return reply(503, friendlyMessage(loadError.message, "Couldn't load this syllabus."));
  if (!syllabus || !syllabus.course_id) return reply(404, "Syllabus not found.");
  if (syllabus.status === "needs_review") return reply(200, "Already read.");
  if (syllabus.status === "confirmed") return reply(409, "This syllabus is already confirmed.");

  const job: Job = {
    supabase,
    userId: user.id,
    syllabusId,
    courseId: syllabus.course_id,
    filePath: syllabus.file_path,
    term: syllabus.courses?.term ?? null,
    termStartDate: syllabus.courses?.term_start_date ?? null,
  };

  // Identical file already read? Copy those results instead of paying again.
  if (syllabus.file_sha256) {
    const { data: twin } = await supabase
      .from("syllabi")
      .select("raw_extraction")
      .eq("file_sha256", syllabus.file_sha256)
      .neq("id", syllabusId)
      .not("raw_extraction", "is", null)
      .limit(1)
      .maybeSingle();
    const previous = extractionOutputSchema.safeParse(twin?.raw_extraction);
    if (previous.success) {
      const saved = await saveExtraction(supabase, { syllabusId, courseId: job.courseId, data: previous.data });
      return saved.ok ? reply(200, "Done.") : markFailed(job, "Couldn't save the results. Please try again.");
    }
  }

  // Cost guards (daily limit, 3 runs per syllabus, one reading at a time), checked and
  // claimed in one locked step inside the database, so parallel requests can't slip past.
  const maxPerDay = maxExtractionsPerDay();
  const { data: begin, error: beginError } = await supabase.rpc("begin_extraction", {
    p_syllabus_id: syllabusId,
    p_max_per_day: maxPerDay,
  });
  if (beginError) return reply(503, friendlyMessage(beginError.message, "Couldn't start reading this syllabus."));
  const refusal = describeBeginResult(begin, maxPerDay);
  if (refusal) return reply(refusal.status, refusal.message);

  try {
    return await readAndSave(job);
  } catch {
    // Never leave a syllabus stuck on "Reading…" after an unexpected error.
    return markFailed(job, "Something went wrong reading your syllabus. Please try again.");
  }
}

async function markFailed(job: Job, message: string) {
  await job.supabase.from("syllabi").update({ status: "failed", error_message: message }).eq("id", job.syllabusId);
  return reply(422, message);
}

async function readAndSave(job: Job) {
  const { supabase, syllabusId } = job;

  const download = await supabase.storage.from(SYLLABI_BUCKET).download(job.filePath);
  if (download.error) return markFailed(job, "We couldn't find the uploaded file. Please upload it again.");
  const pdfBytes = new Uint8Array(await download.data.arrayBuffer());

  // Free local checks before paying for an AI call.
  const inspection = await inspectPdf(pdfBytes);
  if (!inspection.ok) {
    return markFailed(
      job,
      inspection.reason === "locked"
        ? "This PDF is locked. Open it and use Print → Save as PDF to make an unlocked copy, then upload that."
        : "We couldn't open this PDF. Try opening it and using Print → Save as PDF, then upload the new copy.",
    );
  }
  if (inspection.pageCount > MAX_PDF_PAGES) {
    return markFailed(
      job,
      `This PDF has ${inspection.pageCount} pages. Please upload just the syllabus pages (${MAX_PDF_PAGES} at most).`,
    );
  }

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", job.userId).maybeSingle();
  const outcome = await extractSyllabus(pdfBytes, {
    term: job.term,
    termStartDate: job.termStartDate,
    timeZone: profile?.timezone ?? "UTC",
  });

  // Log every Claude call, success or failure (cost tracking + the daily limit).
  await supabase.from("extraction_runs").insert({
    syllabus_id: syllabusId,
    model: outcome.meta.model,
    input_tokens: outcome.meta.inputTokens,
    output_tokens: outcome.meta.outputTokens,
    cost_usd: outcome.meta.costUsd,
    duration_ms: outcome.meta.durationMs,
    succeeded: outcome.ok,
    error_code: outcome.ok ? null : outcome.code,
  });

  if (!outcome.ok) return markFailed(job, outcome.message);

  const saved = await saveExtraction(supabase, { syllabusId, courseId: job.courseId, data: outcome.data });
  if (!saved.ok) return markFailed(job, "We read your syllabus but couldn't save the results. Please try again.");
  return reply(200, "Done.");
}
