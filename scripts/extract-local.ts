// npm run extract:local -- <path to PDF> [--start 2027-01-04] [--term "Winter 2027"] [--tz America/Chicago]
// Sends one PDF to Claude from your computer and prints the validated JSON and the cost.
// Costs a few cents per run. Never prints the PDF itself or your keys.
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { requireEnv } from "./load-env";
import { extractSyllabus } from "../lib/extraction/extract";
import { inspectPdf } from "../lib/pdf/inspect-pdf";

requireEnv("ANTHROPIC_API_KEY");

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    start: { type: "string" },
    term: { type: "string" },
    tz: { type: "string", default: "UTC" },
    model: { type: "string" },
  },
});

async function main() {
  const pdfPath = positionals[0];
  if (!pdfPath) {
    console.error('Usage: npm run extract:local -- <file.pdf> [--start YYYY-MM-DD] [--term "Winter 2027"]');
    process.exit(1);
  }
  if (values.model) process.env.ANTHROPIC_MODEL = values.model;

  const bytes = new Uint8Array(readFileSync(pdfPath));
  const inspection = await inspectPdf(bytes);
  if (!inspection.ok) {
    console.error(`This PDF can't be opened (${inspection.reason}).`);
    process.exit(1);
  }
  console.log(`Reading ${inspection.pageCount} page(s) with ${process.env.ANTHROPIC_MODEL || "claude-sonnet-5"}…`);

  const outcome = await extractSyllabus(bytes, {
    term: values.term ?? null,
    termStartDate: values.start ?? null,
    timeZone: values.tz ?? "UTC",
  });

  if (outcome.ok) {
    console.log(JSON.stringify(outcome.data, null, 2));
  } else {
    console.error(`Failed (${outcome.code}): ${outcome.message}`);
  }
  const { model, inputTokens, outputTokens, costUsd, durationMs } = outcome.meta;
  console.log(
    `\nModel ${model} · ${inputTokens} input + ${outputTokens} output tokens · ` +
      `about $${costUsd?.toFixed(4) ?? "?"} · ${(durationMs / 1000).toFixed(1)} s`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
