import { describe, expect, it } from "vitest";
import { mergeWithCanvas, plannerStatus, sameItem, timeInZone, toCanvasWeekItems } from "./planner";
import type { PlannerItem } from "./schema";

const BASE = "https://canvas.example.edu";

function p(id: number, type: string, title: string, due_at: string, submissions: PlannerItem["submissions"] = false) {
  return {
    course_id: 12,
    plannable_id: id,
    plannable_type: type,
    plannable_date: due_at,
    html_url: `/courses/12/assignments/${id}`,
    plannable: { title, due_at },
    submissions,
  } satisfies PlannerItem;
}

describe("merging Canvas into This week", () => {
  it("gives matched deadlines their Canvas status and keeps the rest as extras", () => {
    const canvas = toCanvasWeekItems(
      [
        p(1, "quiz", "Quiz 4", "2026-10-28T03:59:00Z", { submitted: true }),
        p(2, "assignment", "Surprise reflection", "2026-10-29T03:59:00Z"),
      ],
      BASE,
      "America/Toronto",
    ).map((c) => ({ ...c, courseId: "c1" }));
    const syllabus = [
      { id: "s1", title: "Quiz 4", due_date: "2026-10-27", course_id: "c1" },
      { id: "s2", title: "Quiz 4", due_date: "2026-10-27", course_id: "c2" }, // another course: no match
    ];
    const { statuses, extras } = mergeWithCanvas(syllabus, canvas);
    expect(statuses).toEqual({ s1: "submitted" });
    expect(extras.map((e) => e.title)).toEqual(["Surprise reflection"]);
  });

  it("reads Canvas due times in the student's time zone", () => {
    expect(timeInZone("2026-10-14T03:59:00Z", "America/Toronto")).toBe("23:59");
  });
});

describe("Canvas planner", () => {
  it("keeps graded work, in the student's time zone, with full links", () => {
    const items = toCanvasWeekItems(
      [
        p(1, "assignment", "Lab 3", "2026-10-14T03:59:00Z", { submitted: true }),
        p(2, "planner_note", "Buy coffee", "2026-10-14T15:00:00Z"),
        p(3, "calendar_event", "Office hours", "2026-10-15T15:00:00Z"),
      ],
      BASE,
      "America/Toronto",
    );
    expect(items).toEqual([
      {
        key: "assignment-1",
        title: "Lab 3",
        dueDate: "2026-10-13", // 11:59 PM in Toronto
        dueAt: "2026-10-14T03:59:00Z",
        canvasCourseId: 12,
        status: "submitted",
        url: "https://canvas.example.edu/courses/12/assignments/1",
      },
    ]);
  });

  it("never links outside the student's Canvas server", () => {
    const item = { ...p(4, "quiz", "Quiz", "2026-10-14T03:59:00Z"), html_url: "https://evil.example.com/x" };
    expect(toCanvasWeekItems([item], BASE, "UTC")[0].url).toBeNull();
  });

  it("works out the submission status", () => {
    expect(plannerStatus(p(1, "assignment", "A", "2026-10-14T00:00:00Z", { graded: true, submitted: true }))).toBe(
      "graded",
    );
    expect(plannerStatus(p(1, "assignment", "A", "2026-10-14T00:00:00Z", { missing: true }))).toBe("missing");
    expect(plannerStatus(p(1, "assignment", "A", "2026-10-14T00:00:00Z", false))).toBe("not_submitted");
  });

  it("matches a Canvas item to the same syllabus deadline", () => {
    const [canvas] = toCanvasWeekItems(
      [p(1, "quiz", "Quiz 4 - HTML Forms", "2026-10-28T03:59:00Z")],
      BASE,
      "America/Toronto",
    );
    expect(sameItem({ title: "Quiz 4", due_date: "2026-10-27" }, canvas)).toBe(true);
    expect(sameItem({ title: "Quiz 4", due_date: "2026-10-28" }, canvas)).toBe(false); // different day
    expect(sameItem({ title: "Term Test 2", due_date: "2026-10-27" }, canvas)).toBe(false);
  });
});
