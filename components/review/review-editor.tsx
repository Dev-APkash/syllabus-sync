"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { confirmReview, saveReview, type ActionResult } from "@/app/syllabi/[id]/review/actions";
import { runChecks } from "@/lib/review/checks";
import type { ReviewCourse } from "@/lib/review/schema";
import { AssessmentTable } from "./assessment-table";
import { ChecksPanel } from "./checks-panel";
import { CourseFields } from "./course-fields";
import { blankRow, parseWeight, toPayloadRow, type EditableRow } from "./types";

type Props = {
  syllabusId: string;
  confirmed: boolean;
  initialCourse: ReviewCourse;
  initialRows: EditableRow[];
  gradingNotes: string[];
  warnings: string[];
};

export function ReviewEditor({ syllabusId, confirmed, initialCourse, initialRows, gradingNotes, warnings }: Props) {
  const [course, setCourse] = useState(initialCourse);
  const [rows, setRows] = useState(initialRows);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  // The Checks panel updates live as the student edits.
  const checks = useMemo(
    () =>
      runChecks(
        rows.map((r) => ({ title: r.title, due_date: r.due_date, weight_percent: parseWeight(r.weight) })),
        course.term_start_date || null,
      ),
    [rows, course.term_start_date],
  );

  const payload = () => ({ syllabusId, course, rows: rows.map(toPayloadRow) });
  const updateRow = (key: string, patch: Partial<EditableRow>) =>
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const deleteRow = (key: string) => setRows((current) => current.filter((r) => r.key !== key));

  function save() {
    setResult(null);
    startTransition(async () => setResult(await saveReview(payload())));
  }

  function confirm() {
    if (checks.some((c) => c.level === "warn") && !window.confirm("Some items still need attention. Confirm anyway?")) {
      return;
    }
    setResult(null);
    // On success the server redirects to the course page; otherwise we show why.
    startTransition(async () => setResult(await confirmReview(payload())));
  }

  return (
    <div className="flex flex-col gap-4">
      <CourseFields course={course} onChange={setCourse} />
      <ChecksPanel checks={checks} gradingNotes={gradingNotes} warnings={warnings} />
      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground">
          We didn&apos;t find any deadlines in this file. Add them below, or upload a different PDF.
        </p>
      )}
      <AssessmentTable rows={rows} onChange={updateRow} onDelete={deleteRow} />
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => setRows((r) => [...r, blankRow()])}>
          <Plus />
          Add a row
        </Button>
      </div>

      {/* Pinned to the bottom of the screen so it's always reachable on a long table. */}
      <div className="sticky bottom-4 z-10 mt-2 flex flex-wrap items-center justify-end gap-3 rounded-lg border bg-card/95 px-4 py-3 shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.25)] backdrop-blur">
        {result && (
          <p role="status" className={cn("mr-auto text-sm", result.ok ? "text-success" : "text-destructive")}>
            {result.message}
          </p>
        )}
        <Button type="button" variant="outline" onClick={save} disabled={pending}>
          {pending ? "Saving…" : confirmed ? "Save changes" : "Save draft"}
        </Button>
        {!confirmed && (
          <Button type="button" onClick={confirm} disabled={pending}>
            Confirm and add to calendar
          </Button>
        )}
      </div>
    </div>
  );
}
