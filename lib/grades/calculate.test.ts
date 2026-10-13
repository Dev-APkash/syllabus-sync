import { describe, expect, it } from "vitest";
import { calculateNeededOnFinal, type GradeItem } from "./calculate";

const assignments: GradeItem = { id: "a", title: "Assignments", weight_percent: 30, score_percent: 85 };
const midterm: GradeItem = { id: "m", title: "Midterm", weight_percent: 30, score_percent: 70 };
const final: GradeItem = { id: "f", title: "Final Exam", weight_percent: 40, score_percent: null };
const currentAverage = { type: "current_average" } as const;

describe("calculateNeededOnFinal", () => {
  it("solves the worked example from PLAN.md: 83.75% needed", () => {
    const result = calculateNeededOnFinal({
      items: [assignments, midterm, final],
      finalItemId: "f",
      targetGrade: 80,
      assumption: currentAverage,
    });
    expect(result.status).toBe("reachable");
    expect(result.neededOnFinal).toBe(83.75);
    expect(result.weightMarked).toBe(60);
    expect(result.currentAverage).toBe(77.5);
    expect(result.warnings).toEqual([]);
  });

  it("assumes other unmarked work at your current average", () => {
    const quiz: GradeItem = { id: "q", title: "Quiz", weight_percent: 10, score_percent: null };
    const result = calculateNeededOnFinal({
      items: [{ ...assignments, weight_percent: 20 }, midterm, quiz, final],
      finalItemId: "f",
      targetGrade: 80,
      assumption: currentAverage,
    });
    // earned = 17 + 21 = 38 over 50% → average 76; quiz assumed 7.6 points; (80 − 38 − 7.6) / 40
    expect(result.neededOnFinal).toBe(86);
  });

  it("can assume a fixed percentage instead", () => {
    const quiz: GradeItem = { id: "q", title: "Quiz", weight_percent: 10, score_percent: null };
    const result = calculateNeededOnFinal({
      items: [{ ...assignments, weight_percent: 20 }, midterm, quiz, final],
      finalItemId: "f",
      targetGrade: 80,
      assumption: { type: "fixed", percent: 100 },
    });
    expect(result.neededOnFinal).toBe(80); // (80 − 38 − 10) / 40
  });

  it("says when the target can't be reached with the final alone", () => {
    const result = calculateNeededOnFinal({
      items: [{ ...assignments, score_percent: 40 }, { ...midterm, score_percent: 40 }, final],
      finalItemId: "f",
      targetGrade: 90,
      assumption: currentAverage,
    });
    expect(result.status).toBe("not_reachable");
    expect(result.neededOnFinal).toBeGreaterThan(100);
  });

  it("says when the target is already secured", () => {
    const result = calculateNeededOnFinal({
      items: [{ ...assignments, score_percent: 100 }, { ...midterm, score_percent: 100 }, final],
      finalItemId: "f",
      targetGrade: 50,
      assumption: currentAverage,
    });
    expect(result.status).toBe("already_secured");
  });

  it("needs a mark or a fixed percentage to guess other unmarked work", () => {
    const quiz: GradeItem = { id: "q", title: "Quiz", weight_percent: 10, score_percent: null };
    const result = calculateNeededOnFinal({
      items: [{ ...assignments, score_percent: null }, { ...midterm, score_percent: null }, quiz, final],
      finalItemId: "f",
      targetGrade: 80,
      assumption: currentAverage,
    });
    expect(result.status).toBe("not_enough_info");
  });

  it("warns when weights don't add up to 100 or the final has no weight", () => {
    const short = calculateNeededOnFinal({
      items: [assignments, { ...midterm, weight_percent: 20 }, final],
      finalItemId: "f",
      targetGrade: 80,
      assumption: currentAverage,
    });
    expect(short.warnings.join(" ")).toMatch(/add up to 90%/);

    const noWeight = calculateNeededOnFinal({
      items: [assignments, midterm, { ...final, weight_percent: null }],
      finalItemId: "f",
      targetGrade: 80,
      assumption: currentAverage,
    });
    expect(noWeight.status).toBe("not_enough_info");
    expect(noWeight.warnings.join(" ")).toMatch(/no weight/);
  });
});
