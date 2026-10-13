import type { AssessmentKind } from "@/lib/constants";
import type { ReviewRow } from "@/lib/review/schema";

/** One row as the review table holds it while the student edits. */
export type EditableRow = {
  key: string; // React key: the database id, or a temporary one for new rows
  id?: string;
  title: string;
  kind: AssessmentKind;
  due_date: string;
  due_time: string;
  weight: string; // what's typed in the box; "" = unknown
  include_in_calendar: boolean;
  confidence: string;
  source_quote: string;
  date_text: string;
  notes: string;
};

/** "12.5" → 12.5, "" → null. Invalid text becomes NaN so the server rejects it clearly. */
export function parseWeight(text: string): number | null {
  if (text.trim() === "") return null;
  return Number(text.replace("%", "").trim());
}

export function toPayloadRow(row: EditableRow): ReviewRow {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    due_date: row.due_date,
    due_time: row.due_time ? row.due_time.slice(0, 5) : "",
    weight_percent: parseWeight(row.weight),
    include_in_calendar: row.include_in_calendar,
  };
}

let counter = 0;
export function blankRow(): EditableRow {
  counter += 1;
  return {
    key: `new-${counter}`,
    title: "",
    kind: "assignment",
    due_date: "",
    due_time: "",
    weight: "",
    include_in_calendar: true,
    confidence: "high",
    source_quote: "",
    date_text: "",
    notes: "Added by you",
  };
}
