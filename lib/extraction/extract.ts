import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { estimateCostUsd } from "./pricing";
import { buildExtractionPrompt, type ExtractionContext } from "./prompt";
import { extractionOutputSchema, normalizeExtraction, type ExtractionOutput } from "./schema";

export type ExtractionErrorCode =
  "max_tokens" | "refusal" | "invalid_output" | "bad_pdf" | "rate_limited" | "timeout" | "api_error" | "config";

export type ExtractionMeta = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  durationMs: number;
};

export type ExtractionOutcome =
  | { ok: true; data: ExtractionOutput; meta: ExtractionMeta }
  | { ok: false; code: ExtractionErrorCode; message: string; meta: ExtractionMeta };

// Hard cap on what one reading can cost: 24,000 output tokens (including Claude's thinking)
// is about $0.24 on Sonnet 5, and takes about 4 minutes at most, inside Vercel's 300 s limit.
// There is deliberately no automatic retry with a bigger budget: that tripled the worst case.
const MAX_TOKENS = 24_000;

// The JSON schema Claude must follow. We pass only the schema (not the SDK's
// auto-parser) so we can check stop_reason and normalise values before validating.
const OUTPUT_FORMAT = (() => {
  const { type, schema } = zodOutputFormat(extractionOutputSchema);
  return { type, schema };
})();

const MESSAGES: Record<ExtractionErrorCode, string> = {
  max_tokens:
    "This syllabus was too long to read in one go. Try uploading just the pages with the schedule and grading.",
  refusal: "We couldn't read this document. Please check it's a course syllabus and try again.",
  invalid_output: "Something went wrong reading this syllabus. Please try again.",
  bad_pdf:
    "We couldn't open this PDF. If it's password-protected, open it and use Print → Save as PDF to make an unlocked copy.",
  rate_limited: "Lots of students are uploading right now. Please try again in a minute.",
  timeout: "Reading this syllabus took too long. Please try again, or upload just the schedule and grading pages.",
  api_error: "Our reading service had a problem. Please try again in a minute.",
  config: "Syllabus reading isn't set up correctly. Please let us know.",
};

/**
 * Sends one PDF (inline base64 — never the Files API, which stores files) to
 * Claude with structured outputs, validates the reply with Zod, and reports
 * tokens, cost and duration. Never logs the PDF contents or keys.
 */
export async function extractSyllabus(pdfBytes: Uint8Array, context: ExtractionContext): Promise<ExtractionOutcome> {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const started = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  const meta = (): ExtractionMeta => ({
    model,
    inputTokens,
    outputTokens,
    costUsd: estimateCostUsd(model, inputTokens, outputTokens),
    durationMs: Date.now() - started,
  });
  const fail = (code: ExtractionErrorCode): ExtractionOutcome => ({
    ok: false,
    code,
    message: MESSAGES[code],
    meta: meta(),
  });

  if (!process.env.ANTHROPIC_API_KEY) return fail("config");

  const client = new Anthropic({ timeout: 120_000, maxRetries: 1 });
  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

  try {
    const message = await client.messages
      .stream({
        model,
        max_tokens: MAX_TOKENS,
        system: buildExtractionPrompt(context),
        messages: [
          {
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
              { type: "text", text: "Extract every deadline and graded item from this syllabus." },
            ],
          },
        ],
        // "medium" keeps Claude's thinking (which counts towards max_tokens) in proportion:
        // at the default "high", an 11-page syllabus used all 24,000 tokens in 228 s.
        output_config: { format: OUTPUT_FORMAT, effort: "medium" },
      })
      .finalMessage();

    inputTokens = message.usage.input_tokens;
    outputTokens = message.usage.output_tokens;
    // Token counts only (never the PDF or the answer), on one line so
    // `docker compose logs app | grep "extraction call"` shows all of it.
    const summary = {
      model,
      stopReason: message.stop_reason,
      inputTokens,
      outputTokens,
      thinkingTokens: message.usage.output_tokens_details?.thinking_tokens ?? null,
      ms: Date.now() - started,
    };
    console.info(`extraction call ${JSON.stringify(summary)}`);

    if (message.stop_reason === "refusal") return fail("refusal");
    if (message.stop_reason === "max_tokens") return fail("max_tokens");

    const text = message.content.find((block) => block.type === "text")?.text;
    if (!text) return fail("invalid_output");

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return fail("invalid_output");
    }
    // Structured outputs should guarantee the shape, but we still validate.
    const parsed = extractionOutputSchema.safeParse(normalizeExtraction(raw));
    if (!parsed.success) return fail("invalid_output");
    return { ok: true, data: parsed.data, meta: meta() };
  } catch (error) {
    // Most specific first (see the SDK's error classes).
    if (error instanceof Anthropic.APIConnectionTimeoutError) return fail("timeout");
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      return fail("config");
    }
    if (error instanceof Anthropic.NotFoundError) return fail("config"); // e.g. a mistyped ANTHROPIC_MODEL
    if (error instanceof Anthropic.RateLimitError) return fail("rate_limited");
    if (error instanceof Anthropic.BadRequestError) return fail("bad_pdf"); // locked or corrupt PDFs are rejected here
    if (error instanceof Anthropic.APIError) return fail("api_error");
    return fail("api_error");
  }
}
