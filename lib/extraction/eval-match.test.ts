import { describe, expect, it } from "vitest";
import { scoreFile, titleSimilarity, type EvalItem } from "./eval-match";

const item = (title: string, due_date = "", weight_percent = -1): EvalItem => ({
  title,
  due_date,
  due_time: "",
  weight_percent,
});

describe("titleSimilarity", () => {
  it("scores identical titles 1 and unrelated titles 0", () => {
    expect(titleSimilarity("Midterm Exam", "midterm exam")).toBe(1);
    expect(titleSimilarity("Midterm Exam", "Lab Report")).toBe(0);
  });

  it("keeps numbered items apart", () => {
    expect(titleSimilarity("Quiz 1", "Quiz 2")).toBeLessThan(0.5);
  });
});

describe("scoreFile", () => {
  it("counts found, missed and invented items, plus date and weight accuracy", () => {
    const expected = [
      item("Quiz 1", "2027-01-22", 5),
      item("Midterm Exam", "2027-02-24", 25),
      item("Final Exam", "", 40),
    ];
    const actual = [
      item("Quiz 1", "2027-01-22", 5),
      item("Midterm", "2027-02-25", 25),
      item("Bonus Essay", "2027-03-01", 5),
    ];
    const score = scoreFile(expected, actual);

    expect(score.found).toBe(2); // Quiz 1, Midterm
    expect(score.missed).toEqual(["Final Exam"]);
    expect(score.extra).toEqual(["Bonus Essay"]);
    expect(score.datesCorrect).toBe(1); // the midterm date is a day off
    expect(score.weightsCorrect).toBe(2);
  });

  it("uses the date to pair up two lab sections correctly", () => {
    const expected = [item("Lab Report 1 (L01)", "2027-02-02", 10), item("Lab Report 1 (L02)", "2027-02-04", 10)];
    const actual = [item("Lab Report 1", "2027-02-04", 10), item("Lab Report 1", "2027-02-02", 10)];
    const score = scoreFile(expected, actual);
    expect(score.found).toBe(2);
    expect(score.datesCorrect).toBe(2);
  });
});
