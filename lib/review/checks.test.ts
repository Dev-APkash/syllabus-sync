import { describe, expect, it } from "vitest";
import {
  duplicateCheck,
  outOfTermCheck,
  rowAttention,
  runChecks,
  undatedCheck,
  weightCheck,
  type CheckRow,
} from "./checks";

const row = (title: string, due_date: string, weight_percent: number | null, confidence = "high"): CheckRow => ({
  title,
  due_date,
  weight_percent,
  confidence,
});

describe("weightCheck", () => {
  it("is green at exactly 100%, even with decimal shares", () => {
    const quizzes = [1, 2, 3, 4, 5].map((n) => row(`Quiz ${n}`, "", 3.2)); // 16%
    const rest = [row("Labs", "", 20), row("Midterm", "", 24), row("Final", "", 40)];
    expect(weightCheck([...quizzes, ...rest]).level).toBe("ok");
  });

  it("says how much is missing", () => {
    expect(weightCheck([row("A", "", 50), row("B", "", 40)])).toEqual({
      level: "warn",
      message: "Weights add up to 90%, so 10% is missing.",
    });
  });

  it("says how much is extra", () => {
    expect(weightCheck([row("A", "", 70), row("B", "", 40)]).message).toMatch(/110%.*10% too much/);
  });
});

describe("other checks", () => {
  it("counts undated items", () => {
    expect(undatedCheck([row("A", "", 10), row("B", "2027-02-01", 10)])?.message).toMatch(/^1 item has no date/);
    expect(undatedCheck([row("B", "2027-02-01", 10)])).toBeNull();
  });

  it("flags dates outside the term", () => {
    const rows = [row("Early", "2026-12-20", 5), row("Fine", "2027-03-01", 5), row("Late", "2027-07-01", 5)];
    const check = outOfTermCheck(rows, "2027-01-04");
    expect(check?.message).toContain("Early");
    expect(check?.message).toContain("Late");
    expect(check?.message).not.toContain("Fine");
    expect(outOfTermCheck(rows, null)).toBeNull();
  });

  it("finds the same title on the same date", () => {
    expect(duplicateCheck([row("Quiz 1", "2027-01-22", 5), row("quiz  1", "2027-01-22", 5)])?.message).toMatch(
      /quiz 1/,
    );
    expect(duplicateCheck([row("Quiz 1", "2027-01-22", 5), row("Quiz 1", "2027-01-29", 5)])).toBeNull();
  });

  it("combines everything, always including the weight total", () => {
    expect(runChecks([row("A", "2027-02-01", 100)], "2027-01-04")).toEqual([
      { level: "ok", message: "Weights add up to 100%." },
    ]);
  });
});

describe("rowAttention", () => {
  it("explains why a row is highlighted", () => {
    expect(rowAttention(row("Final", "", null, "low"))).toEqual(["the AI wasn't sure", "no date", "no weight"]);
    expect(rowAttention(row("Quiz", "2027-01-22", 5))).toEqual([]);
  });
});
