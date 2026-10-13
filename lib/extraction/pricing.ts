// US$ per million tokens. Check the current prices before relying on these:
// https://platform.claude.com/docs/en/about-claude/pricing  (checked September 2026)
const PRICES_PER_MILLION: { prefix: string; input: number; output: number }[] = [
  { prefix: "claude-sonnet-5", input: 2, output: 10 },
  { prefix: "claude-haiku-4-5", input: 1, output: 5 },
];

/** Estimated cost in US$ of one call. Unknown models return null (logged as unknown cost). */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = PRICES_PER_MILLION.find((p) => model.startsWith(p.prefix));
  if (!price) return null;
  const cost = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
  return Math.round(cost * 10_000) / 10_000; // 4 decimal places, like the database column
}
