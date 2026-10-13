import { describe, expect, it } from "vitest";
import {
  dueWithin,
  isTermOver,
  lastDueDateByCourse,
  nextDeadlineByCourse,
  splitDeadlines,
  upcomingExamsByCourse,
  weightStillToCome,
} from "./deadlines";

const item = (title: string, due_date: string | null, weight: number | null = 5, due_time: string | null = null) => ({
  title,
  due_date,
  due_time,
  weight_percent: weight,
  course_id: "c1",
});

const TODAY = "2026-10-09";
const items = [
  item("Quiz 1", "2026-09-15", 3),
  item("Term Test 1", "2026-10-06", 12),
  item("Quiz 4", "2026-10-27", 3, "17:00"),
  item("Tutorial Activity 2B", "2026-10-27", 2),
  item("Term Test 2", "2026-11-03", 12),
  item("Due today", TODAY, 1),
  item("Final project", null, 17),
];

describe("splitDeadlines", () => {
  it("puts today's items first, then later ones soonest first", () => {
    const split = splitDeadlines(items, TODAY);
    expect(split.next.map((i) => i.title)).toEqual(["Due today"]);
    expect(split.later.map((i) => i.title)).toEqual(["Tutorial Activity 2B", "Quiz 4", "Term Test 2"]);
  });

  it("groups everything on the nearest date into 'next'", () => {
    const split = splitDeadlines(items, "2026-10-20");
    expect(split.next.map((i) => i.title)).toEqual(["Tutorial Activity 2B", "Quiz 4"]); // all-day first
    expect(split.later.map((i) => i.title)).toEqual(["Term Test 2"]);
  });

  it("lists past items most recent first and keeps undated ones separate", () => {
    const split = splitDeadlines(items, TODAY);
    expect(split.past.map((i) => i.title)).toEqual(["Term Test 1", "Quiz 1"]);
    expect(split.undated.map((i) => i.title)).toEqual(["Final project"]);
  });

  it("handles a term that is over", () => {
    const split = splitDeadlines(items, "2027-01-01");
    expect(split.next).toEqual([]);
    expect(split.later).toEqual([]);
    expect(split.past).toHaveLength(6);
  });
});

describe("weightStillToCome", () => {
  it("adds up upcoming and undated weights", () => {
    expect(weightStillToCome(items, TODAY)).toBe(1 + 3 + 2 + 12 + 17);
  });
});

describe("done items", () => {
  it("skips ticked-off items when choosing Next up, but keeps them in the list", () => {
    const list = [
      { ...item("Quiz 4", "2026-10-13"), completed_at: "2026-10-12T10:00:00Z" },
      item("Test 2", "2026-11-03"),
    ];
    const split = splitDeadlines(list, TODAY);
    expect(split.next.map((i) => i.title)).toEqual(["Test 2"]);
    expect(split.later.map((i) => i.title)).toEqual(["Quiz 4"]);
  });
});

describe("lastDueDateByCourse", () => {
  it("finds each course's last deadline, or null when one has no date", () => {
    const list = [
      item("a", "2026-12-10"),
      item("b", "2026-12-18"),
      { ...item("c", "2026-11-01"), course_id: "c2" },
      { ...item("d", null), course_id: "c2" },
    ];
    expect(lastDueDateByCourse(list)).toEqual({ c1: "2026-12-18", c2: null });
  });
});

describe("isTermOver", () => {
  it("is over two weeks after the last deadline of every course", () => {
    expect(isTermOver(["2026-12-10", "2026-12-18"], "2027-01-01")).toBe(false); // exactly 14 days after Dec 18
    expect(isTermOver(["2026-12-10", "2026-12-18"], "2027-01-02")).toBe(true);
    expect(isTermOver(["2026-12-10", null], "2027-03-01")).toBe(false); // a course with no dates keeps it open
    expect(isTermOver([], "2027-03-01")).toBe(false);
  });
});

describe("dueWithin", () => {
  it("keeps today plus the next six days, across a month boundary", () => {
    const list = [item("a", "2026-10-28"), item("b", "2026-11-03"), item("c", "2026-11-04"), item("d", "2026-10-27")];
    expect(dueWithin(list, "2026-10-28", 7).map((i) => i.title)).toEqual(["a", "b"]);
  });
});

describe("upcomingExamsByCourse", () => {
  it("groups upcoming exams by course, undated ones last, and skips past exams", () => {
    const exam = (title: string, due_date: string | null, course_id: string, kind = "midterm") => ({
      ...item(title, due_date),
      course_id,
      kind,
    });
    const list = [
      exam("Final", null, "c1", "final_exam"),
      exam("Midterm", "2026-10-22", "c1"),
      exam("Old test", "2026-09-30", "c1", "test"),
      exam("Quiz 4", "2026-10-15", "c1", "quiz"),
      exam("Term test", "2026-11-05", "c2", "test"),
    ];
    const groups = upcomingExamsByCourse(list, TODAY, ["midterm", "test", "final_exam"], ["c2", "c1", "c3"]);
    expect(groups.map((g) => [g.courseId, g.exams.map((e) => e.title)])).toEqual([
      ["c2", ["Term test"]],
      ["c1", ["Midterm", "Final"]],
    ]);
  });
});

describe("nextDeadlineByCourse", () => {
  it("finds the soonest upcoming item for each course", () => {
    const other = { ...item("Lab 1", "2026-10-12", 10), course_id: "c2" };
    const next = nextDeadlineByCourse([...items, other], "2026-10-10");
    expect(next.get("c1")?.title).toBe("Tutorial Activity 2B");
    expect(next.get("c2")?.title).toBe("Lab 1");
  });
});
