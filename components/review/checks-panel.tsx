import { CircleCheck, CircleAlert, Info } from "lucide-react";
import type { Check } from "@/lib/review/checks";

export function ChecksPanel({
  checks,
  gradingNotes,
  warnings,
}: {
  checks: Check[];
  gradingNotes: string[];
  warnings: string[];
}) {
  const notes = [...gradingNotes.map((n) => `Grading rule: ${n}`), ...warnings.map((w) => `Noted while reading: ${w}`)];
  return (
    <section className="rounded-lg border bg-card" aria-live="polite">
      <h2 className="border-b px-4 py-2.5 text-sm font-medium">Checks</h2>
      <ul className="flex flex-col gap-2 px-4 py-3 text-sm">
        {checks.map((check) => (
          <li key={check.message} className="flex items-start gap-2.5">
            {check.level === "ok" ? (
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="OK" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-label="Check" />
            )}
            {check.message}
          </li>
        ))}
        {notes.map((note) => (
          <li key={note} className="flex items-start gap-2.5 text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {note}
          </li>
        ))}
      </ul>
    </section>
  );
}
