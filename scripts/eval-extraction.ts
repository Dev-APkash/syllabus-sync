// npm run eval -- --model claude-sonnet-5      (add --yes to skip the "are you sure?" question)
// Measures extraction accuracy against answer keys. COSTS MONEY: a few cents per syllabus.
//   Invented set: test-fixtures/syllabi/*.pdf with keys in test-fixtures/expected/<name>.json
//   Real set:     test-fixtures/private/*.pdf with keys next to them as <name>.json (optional
//                 "context": { "term_start_date": "...", "term": "...", "timezone": "..." } inside)
// Saves a summary (no syllabus text) to eval-results/<date>-<model>.json.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import { requireEnv } from "./load-env";
import { extractSyllabus } from "../lib/extraction/extract";
import { scoreFile, type FileScore } from "../lib/extraction/eval-match";
import { extractionOutputSchema } from "../lib/extraction/schema";

requireEnv("ANTHROPIC_API_KEY");

const { values } = parseArgs({ options: { model: { type: "string" }, yes: { type: "boolean", default: false } } });
if (values.model) process.env.ANTHROPIC_MODEL = values.model;
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const answerKeySchema = extractionOutputSchema.extend({
  context: z
    .object({ term_start_date: z.string().optional(), term: z.string().optional(), timezone: z.string().optional() })
    .optional(),
});

type Case = { name: string; pdfPath: string; keyPath: string };

function findCases(): Case[] {
  const cases: Case[] = [];
  const add = (dir: string, keyDir: string) => {
    if (!existsSync(dir)) return;
    for (const file of readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"))) {
      const name = basename(file, ".pdf");
      const keyPath = join(keyDir, `${name}.json`);
      if (existsSync(keyPath)) cases.push({ name, pdfPath: join(dir, file), keyPath });
      else console.log(`(skipping ${file}: no answer key at ${keyPath})`);
    }
  };
  add("test-fixtures/syllabi", "test-fixtures/expected");
  add("test-fixtures/private", "test-fixtures/private");
  return cases;
}

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "n/a");

async function main() {
  const cases = findCases();
  if (!cases.length) {
    console.error("No PDFs with answer keys found. Run `npm run make-fixtures` first.");
    process.exit(1);
  }
  if (!values.yes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Run ${cases.length} extraction(s) with ${model}? This costs money. [y/N] `);
    rl.close();
    if (answer.trim().toLowerCase() !== "y") process.exit(0);
  }

  const results: (FileScore & { name: string; costUsd: number | null; durationMs: number; error?: string })[] = [];
  for (const c of cases) {
    const key = answerKeySchema.parse(JSON.parse(readFileSync(c.keyPath, "utf8")));
    const outcome = await extractSyllabus(new Uint8Array(readFileSync(c.pdfPath)), {
      term: key.context?.term ?? key.course.term ?? null,
      termStartDate: key.context?.term_start_date ?? "2027-01-04",
      timeZone: key.context?.timezone ?? "America/Toronto",
    });
    const score = scoreFile(key.assessments, outcome.ok ? outcome.data.assessments : []);
    results.push({
      name: c.name,
      ...score,
      costUsd: outcome.meta.costUsd,
      durationMs: outcome.meta.durationMs,
      error: outcome.ok ? undefined : outcome.code,
    });
    console.log(
      `${c.name}: found ${score.found}/${score.expected}, dates ${pct(score.datesCorrect, score.found)}, ` +
        `weights ${pct(score.weightsCorrect, score.weightsChecked)}, extra ${score.extra.length}, ` +
        `$${outcome.meta.costUsd?.toFixed(4) ?? "?"}, ${(outcome.meta.durationMs / 1000).toFixed(1)} s` +
        (outcome.ok ? "" : `  [FAILED: ${outcome.code}]`),
    );
    if (score.missed.length) console.log(`   missed: ${score.missed.join("; ")}`);
    if (score.extra.length) console.log(`   extra:  ${score.extra.join("; ")}`);
  }

  const sum = (key: "expected" | "found" | "datesCorrect" | "weightsCorrect" | "weightsChecked") =>
    results.reduce((total, r) => total + r[key], 0);
  const totalCost = results.reduce((t, r) => t + (r.costUsd ?? 0), 0);
  const summary = {
    model,
    ranAt: new Date().toISOString(),
    files: results.length,
    itemsFound: pct(sum("found"), sum("expected")),
    datesExact: pct(sum("datesCorrect"), sum("found")),
    weightsWithinHalfPoint: pct(sum("weightsCorrect"), sum("weightsChecked")),
    extraItems: results.reduce((t, r) => t + r.extra.length, 0),
    totalCostUsd: Math.round(totalCost * 10_000) / 10_000,
    averageCostUsd: Math.round((totalCost / results.length) * 10_000) / 10_000,
    perFile: results,
  };

  console.log(
    `\n${model} finds ${summary.itemsFound} of deadlines with ${summary.datesExact} of dates exactly right, ` +
      `for about $${summary.averageCostUsd} a syllabus. (${summary.extraItems} invented item(s).)`,
  );
  mkdirSync("eval-results", { recursive: true });
  const out = `eval-results/${summary.ranAt.slice(0, 10)}-${model}.json`;
  writeFileSync(out, JSON.stringify(summary, null, 2) + "\n");
  console.log(`Saved ${out}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
