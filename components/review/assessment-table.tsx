"use client";

import { Fragment, useState } from "react";
import { Quote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASSESSMENT_KINDS, KIND_LABELS, type AssessmentKind } from "@/lib/constants";
import { rowAttention } from "@/lib/review/checks";
import { cn } from "@/lib/utils";
import { parseWeight, type EditableRow } from "./types";

type Props = {
  rows: EditableRow[];
  onChange: (key: string, patch: Partial<EditableRow>) => void;
  onDelete: (key: string) => void;
};

const cell = "px-2 py-2 align-top first:pl-4 last:pr-3";
const field = "h-8 text-sm";

export function AssessmentTable({ rows, onChange, onDelete }: Props) {
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  return (
    // Horizontal scrolling keeps the table usable on a phone.
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[740px] text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th className={cn(cell, "py-2.5 font-medium")}>Item</th>
            <th className={cn(cell, "py-2.5 font-medium")}>Type</th>
            <th className={cn(cell, "py-2.5 font-medium")}>Due date</th>
            <th className={cn(cell, "py-2.5 font-medium")}>Time</th>
            <th className={cn(cell, "py-2.5 font-medium")}>Weight</th>
            <th className={cn(cell, "py-2.5 text-center font-medium")}>Calendar</th>
            <th className={cell}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const reasons = rowAttention({
              title: row.title,
              due_date: row.due_date,
              weight_percent: parseWeight(row.weight),
              confidence: row.confidence,
            });
            const flagged = reasons.length > 0;
            return (
              <Fragment key={row.key}>
                <tr
                  className={cn(
                    "border-b border-l-2 border-l-transparent last:border-b-0",
                    flagged && "border-l-warning bg-highlight/35",
                  )}
                >
                  <td className={cn(cell, "min-w-[10rem]")}>
                    <Input
                      aria-label="Item"
                      className={field}
                      value={row.title}
                      onChange={(e) => onChange(row.key, { title: e.target.value })}
                    />
                    {flagged && <p className="mt-1 text-xs text-highlight-foreground">Check: {reasons.join(", ")}</p>}
                  </td>
                  <td className={cell}>
                    <select
                      aria-label="Type"
                      className="h-8 rounded-md border border-input bg-card px-2 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                      value={row.kind}
                      onChange={(e) => onChange(row.key, { kind: e.target.value as AssessmentKind })}
                    >
                      {ASSESSMENT_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {KIND_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={cell}>
                    <Input
                      aria-label="Due date"
                      type="date"
                      // Wide enough for Firefox, which spaces the date out ("2026 - 09 - 15") and adds an icon.
                      className={cn(field, "w-[10.5rem] tabular-nums")}
                      value={row.due_date}
                      onChange={(e) => onChange(row.key, { due_date: e.target.value })}
                    />
                  </td>
                  <td className={cell}>
                    <Input
                      aria-label="Time (empty = all day)"
                      type="time"
                      className={cn(field, "w-[6.75rem] tabular-nums")}
                      value={row.due_time}
                      onChange={(e) => onChange(row.key, { due_time: e.target.value })}
                    />
                  </td>
                  <td className={cell}>
                    <div className="relative w-[4.5rem]">
                      <Input
                        aria-label="Weight %"
                        inputMode="decimal"
                        className={cn(field, "pr-6 text-right tabular-nums")}
                        value={row.weight}
                        onChange={(e) => onChange(row.key, { weight: e.target.value })}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        %
                      </span>
                    </div>
                  </td>
                  <td className={cn(cell, "text-center")}>
                    <input
                      aria-label="Include in calendar"
                      type="checkbox"
                      className="mt-2 h-4 w-4 accent-[hsl(var(--primary))]"
                      checked={row.include_in_calendar}
                      onChange={(e) => onChange(row.key, { include_in_calendar: e.target.checked })}
                    />
                  </td>
                  <td className={cn(cell, "whitespace-nowrap")}>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="What the syllabus said"
                      aria-expanded={openInfo === row.key}
                      className={cn("text-muted-foreground", openInfo === row.key && "bg-accent text-foreground")}
                      onClick={() => setOpenInfo(openInfo === row.key ? null : row.key)}
                    >
                      <Quote />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Delete row"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(row.key)}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
                {openInfo === row.key && (
                  <tr className="border-b bg-muted/50">
                    <td colSpan={7} className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">What the syllabus said</p>
                      <p className="mt-1 font-serif text-[15px]">
                        {row.source_quote ? `“${row.source_quote}”` : "No quote: this row was added by hand."}
                      </p>
                      {(row.date_text || row.notes) && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {row.date_text && <>Date as written: {row.date_text}</>}
                          {row.date_text && row.notes && " · "}
                          {row.notes && <>Notes: {row.notes}</>}
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
