"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveGrades } from "@/app/courses/[id]/grades/actions";
import { calculateNeededOnFinal, type Assumption } from "@/lib/grades/calculate";
import { GradeResultMessage } from "./grade-result";

export type CalculatorItem = { id: string; title: string; weight_percent: number; score_percent: number | null };

const toNumber = (text: string): number | null => (text.trim() === "" ? null : Number(text));

type Props = {
  courseId: string;
  items: CalculatorItem[];
  defaultFinalId: string;
  initialTarget: number | null;
  /** Marks found in Canvas (percent), by item id. Only suggestions until the student saves. */
  canvasMarks: Record<string, number>;
  /** The course grade Canvas shows, if any. */
  canvasCurrent: number | null;
};

export function GradeCalculator({ courseId, items, defaultFinalId, initialTarget, canvasMarks, canvasCurrent }: Props) {
  const [marks, setMarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.score_percent === null ? "" : String(i.score_percent)])),
  );
  const [target, setTarget] = useState(initialTarget === null ? "80" : String(initialTarget));
  const [finalId, setFinalId] = useState(defaultFinalId);
  const [useFixed, setUseFixed] = useState(false);
  const [fixedPercent, setFixedPercent] = useState("75");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const targetNumber = toNumber(target) ?? 0;
  const result = useMemo(() => {
    const assumption: Assumption = useFixed
      ? { type: "fixed", percent: toNumber(fixedPercent) ?? 0 }
      : { type: "current_average" };
    return calculateNeededOnFinal({
      items: items.map((i) => ({ ...i, score_percent: i.id === finalId ? null : toNumber(marks[i.id] ?? "") })),
      finalItemId: finalId,
      targetGrade: targetNumber,
      assumption,
    });
  }, [items, marks, finalId, targetNumber, useFixed, fixedPercent]);

  function save() {
    setStatus(null);
    startTransition(async () =>
      setStatus(
        await saveGrades({
          courseId,
          targetGrade: toNumber(target),
          scores: items.map((i) => ({ id: i.id, score: toNumber(marks[i.id] ?? "") })),
        }),
      ),
    );
  }

  const finalTitle = items.find((i) => i.id === finalId)?.title ?? "final";

  // Canvas marks that could fill an empty box (never overwrites a mark the student typed).
  const fillable = items.filter((i) => i.id !== finalId && canvasMarks[i.id] !== undefined && !marks[i.id]?.trim());
  function fillFromCanvas() {
    setMarks({ ...marks, ...Object.fromEntries(fillable.map((i) => [i.id, String(canvasMarks[i.id])])) });
    setStatus({ ok: true, message: "Canvas marks filled in. Save marks to keep them." });
  }

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20";

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-8">
        {(Object.keys(canvasMarks).length > 0 || canvasCurrent !== null) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
            <p>
              <span className="font-medium">From Canvas:</span> {Object.keys(canvasMarks).length} marked item
              {Object.keys(canvasMarks).length === 1 ? "" : "s"} matched
              {canvasCurrent !== null && (
                <span className="text-muted-foreground"> · current grade {canvasCurrent}%</span>
              )}
            </p>
            {fillable.length > 0 && (
              <Button type="button" size="sm" variant="outline" onClick={fillFromCanvas}>
                Use Canvas marks ({fillable.length})
              </Button>
            )}
          </div>
        )}
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Your marks so far</h2>
          <ul className="divide-y rounded-lg border bg-card">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate">{i.title}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    Worth {i.weight_percent}%
                    {canvasMarks[i.id] !== undefined && i.id !== finalId && <> · Canvas: {canvasMarks[i.id]}%</>}
                  </span>
                </span>
                {i.id === finalId ? (
                  <span className="text-sm text-muted-foreground">Final</span>
                ) : (
                  <div className="relative w-24 shrink-0">
                    <Input
                      aria-label={`My mark for ${i.title} (%)`}
                      placeholder="–"
                      inputMode="decimal"
                      className="pr-6 text-right tabular-nums"
                      value={marks[i.id] ?? ""}
                      onChange={(e) => setMarks({ ...marks, [i.id]: e.target.value })}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="target">Target for the course</Label>
            <div className="relative">
              <Input
                id="target"
                inputMode="decimal"
                className="pr-6 tabular-nums"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="final">Which item is the final?</Label>
            <select id="final" className={selectClass} value={finalId} onChange={(e) => setFinalId(e.target.value)}>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title} ({i.weight_percent}%)
                </option>
              ))}
            </select>
          </div>
        </section>

        <fieldset className="flex flex-col gap-2.5 text-sm">
          <legend className="mb-2 font-medium">For other work you don&apos;t have a mark for yet</legend>
          <label className="flex items-center gap-2.5">
            <input
              type="radio"
              name="assumption"
              className="accent-[hsl(var(--primary))]"
              checked={!useFixed}
              onChange={() => setUseFixed(false)}
            />
            Assume my current average
          </label>
          <label className="flex items-center gap-2.5">
            <input
              type="radio"
              name="assumption"
              className="accent-[hsl(var(--primary))]"
              checked={useFixed}
              onChange={() => setUseFixed(true)}
            />
            Assume
            <Input
              aria-label="Assumed percentage"
              className="h-8 w-16 text-right tabular-nums"
              inputMode="decimal"
              value={fixedPercent}
              onChange={(e) => {
                setFixedPercent(e.target.value);
                setUseFixed(true);
              }}
            />
            %
          </label>
        </fieldset>

        <div className="flex items-center gap-4 border-t pt-5">
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save marks"}
          </Button>
          {status && (
            <p role="status" className={status.ok ? "text-sm text-success" : "text-sm text-destructive"}>
              {status.message}
            </p>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <GradeResultMessage result={result} finalTitle={finalTitle} target={targetNumber} />
      </div>
    </div>
  );
}
