import { describe, expect, it } from "vitest";
import type { CanvasAssignment } from "./schema";
import { normalizeCanvasUrl, nextPageUrl } from "./schema";
import {
  assignmentStatus,
  currentScore,
  formatDueAt,
  matchCanvasCourse,
  matchCanvasMarks,
  scorePercent,
  summarizeAssignments,
} from "./summary";

const NOW = new Date("2026-10-10T16:00:00Z");

function a(
  id: number,
  due_at: string | null,
  submission: CanvasAssignment["submission"] = null,
  points = 20,
): CanvasAssignment {
  return {
    id,
    name: `A${id}`,
    due_at,
    points_possible: points,
    html_url: `https://canvas.example.edu/a/${id}`,
    submission,
  };
}

const list = [
  a(1, "2026-10-13T03:59:00Z", { workflow_state: "unsubmitted" }),
  a(2, "2026-10-12T03:59:00Z", { workflow_state: "submitted", submitted_at: "2026-10-11T10:00:00Z" }),
  a(3, "2026-11-30T03:59:00Z", { workflow_state: "unsubmitted" }), // more than 14 days away
  a(4, "2026-10-01T03:59:00Z", { workflow_state: "unsubmitted", missing: true }),
  a(5, "2026-09-20T03:59:00Z", { workflow_state: "graded", score: 18, graded_at: "2026-09-25T12:00:00Z" }),
  a(6, "2026-09-27T03:59:00Z", { workflow_state: "graded", score: 15, graded_at: "2026-10-02T12:00:00Z" }),
  a(7, "2026-09-28T03:59:00Z", { workflow_state: "graded", score: null }), // grade not posted yet
  a(8, "2026-10-11T03:59:00Z", { workflow_state: "unsubmitted", excused: true }),
];

describe("Canvas assignment summary", () => {
  it("works out each assignment's status", () => {
    expect(list.map(assignmentStatus)).toEqual([
      "not_submitted",
      "submitted",
      "not_submitted",
      "missing",
      "graded",
      "graded",
      "submitted", // graded, but the score isn't released yet
      "excused",
    ]);
  });

  it("lists what's due in the next 14 days, soonest first, skipping graded and excused work", () => {
    expect(summarizeAssignments(list, NOW).dueSoon.map((x) => x.id)).toEqual([2, 1]);
  });

  it("lists missing work and graded work, most recent first", () => {
    const summary = summarizeAssignments(list, NOW);
    expect(summary.missing.map((x) => x.id)).toEqual([4]);
    expect(summary.graded.map((x) => x.id)).toEqual([6, 5]);
  });

  it("turns a score into a percentage", () => {
    expect(scorePercent(list[4])).toBe(90);
    expect(scorePercent(a(9, null, { workflow_state: "graded", score: 5 }, 0))).toBeNull();
  });
});

describe("matchCanvasMarks", () => {
  it("matches graded Canvas work to syllabus items by name, exact names first", () => {
    const graded = (id: number, name: string, score: number, points = 10) => ({
      ...a(id, "2026-10-01T00:00:00Z", { workflow_state: "graded", score }, points),
      name,
    });
    const assignments = [
      graded(1, "Assignment 10", 5),
      graded(2, "Assignment 1", 9),
      graded(3, "Quiz 1 - HTML", 8),
      { ...a(4, "2026-10-01T00:00:00Z", { workflow_state: "submitted" }), name: "Quiz 2" }, // not graded yet
    ];
    const items = [
      { id: "s1", title: "Assignment 1" },
      { id: "s2", title: "Quiz 1" },
      { id: "s3", title: "Quiz 2" },
      { id: "s4", title: "Final Exam" },
    ];
    expect(matchCanvasMarks(items, assignments)).toEqual({ s1: 90, s2: 80 });
  });
});

describe("Canvas courses", () => {
  const courses = [
    { id: 11, name: "BUSI1010U - Intro to Business (Fall 2026)", course_code: "BUSI1010U" },
    { id: 12, name: "Web and Script Programming", course_code: "INFR 3120U" },
  ];

  it("matches a course code to the right Canvas course, ignoring spaces and suffixes", () => {
    expect(matchCanvasCourse("INFR3120", courses)).toBe(12);
    expect(matchCanvasCourse("busi 1010", courses)).toBe(11);
    expect(matchCanvasCourse("MATH1000", courses)).toBeNull();
    expect(matchCanvasCourse(null, courses)).toBeNull();
  });

  it("reads the student's current score", () => {
    const course = {
      id: 1,
      enrollments: [{ type: "student", computed_current_score: 84.2, computed_current_grade: "A" }],
    };
    expect(currentScore(course)).toEqual({ score: 84.2, grade: "A" });
    expect(currentScore({ id: 2 })).toEqual({ score: null, grade: null });
  });
});

describe("Canvas helpers", () => {
  it("shows due times in the student's time zone", () => {
    expect(formatDueAt("2026-10-14T03:59:00Z", "America/Toronto")).toBe("Tue, Oct 13, 11:59 PM");
  });

  it("accepts only public https Canvas addresses", () => {
    expect(normalizeCanvasUrl("learn.school.edu")).toBe("https://learn.school.edu");
    expect(normalizeCanvasUrl(" https://Learn.School.edu/courses/12 ")).toBe("https://learn.school.edu");
    expect(normalizeCanvasUrl("http://learn.school.edu")).toBeNull();
    expect(normalizeCanvasUrl("https://192.0.2.10")).toBeNull(); // documentation-only IP range
    expect(normalizeCanvasUrl("api-gw:8000")).toBeNull();
    expect(normalizeCanvasUrl("https://localhost")).toBeNull();
    expect(normalizeCanvasUrl("https://learn.school.edu:8443")).toBeNull();
  });

  it("finds the next page in Canvas's Link header", () => {
    const header =
      '<https://c.example.edu/api/v1/x?page=1>; rel="current", <https://c.example.edu/api/v1/x?page=2>; rel="next"';
    expect(nextPageUrl(header)).toBe("https://c.example.edu/api/v1/x?page=2");
    expect(nextPageUrl('<https://c.example.edu/api/v1/x?page=3>; rel="last"')).toBeNull();
    expect(nextPageUrl(null)).toBeNull();
  });
});
