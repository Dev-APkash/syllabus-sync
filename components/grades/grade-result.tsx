import type { GradeResult } from "@/lib/grades/calculate";

/** The answer, shown large, with the reasoning underneath. */
export function GradeResultMessage({
  result,
  finalTitle,
  target,
}: {
  result: GradeResult;
  finalTitle: string;
  target: number;
}) {
  const needed = result.neededOnFinal === null ? "" : `${result.neededOnFinal.toFixed(1)}%`;
  const figure = {
    reachable: needed,
    already_secured: "0%",
    not_reachable: needed,
    not_enough_info: "–",
  }[result.status];
  const sentence = {
    reachable: `needed on the ${finalTitle} to finish with ${target}%.`,
    already_secured: `needed: you've already secured ${target}%, even with nothing on the ${finalTitle}.`,
    not_reachable: `would be needed on the ${finalTitle}, so ${target}% isn't reachable with the final alone.`,
    not_enough_info:
      "Not enough information yet. Enter at least one mark, or choose a fixed percentage for the other unmarked work.",
  }[result.status];

  return (
    <section className="rounded-lg border bg-card p-6" aria-live="polite">
      <p
        className={
          result.status === "not_reachable"
            ? "font-serif text-5xl tabular-nums text-destructive"
            : "font-serif text-5xl tabular-nums text-primary"
        }
      >
        {figure}
      </p>
      <p className="mt-2 text-muted-foreground">{sentence}</p>
      {result.currentAverage !== null && (
        <p className="mt-4 border-t pt-4 text-sm tabular-nums text-muted-foreground">
          Average on marked work: <span className="text-foreground">{result.currentAverage.toFixed(1)}%</span> across{" "}
          {result.weightMarked}% of the course.
        </p>
      )}
      {result.warnings.map((w) => (
        <p key={w} className="mt-3 text-sm text-warning">
          {w}
        </p>
      ))}
    </section>
  );
}
