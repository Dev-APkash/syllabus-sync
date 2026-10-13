import { describe, expect, it } from "vitest";
import { extractionOutputSchema, normalizeExtraction, toAssessmentRows, type ExtractionOutput } from "./schema";

const sample: ExtractionOutput = {
  course: { code: "PSYC 1010", name: "Introduction to Psychology", instructor: "Dr. A. Rivera", term: "Winter 2027" },
  assessments: [
    {
      title: "Research Summary 1",
      kind: "assignment",
      due_date: "2027-02-05",
      due_time: "23:59",
      date_text: "Friday of Week 5, 11:59 pm",
      weight_percent: 10,
      source_quote: "Research Summary 1 (10%) is due Friday of Week 5 by 11:59 pm.",
      confidence: "high",
      notes: "",
    },
    {
      title: "Final Exam",
      kind: "final_exam",
      due_date: "",
      due_time: "",
      date_text: "Scheduled by the Registrar during the exam period",
      weight_percent: 40,
      source_quote: "Final exam (40%), date set by the Registrar.",
      confidence: "high",
      notes: "Date not announced yet",
    },
  ],
  grading_notes: ["Lowest of the 5 quizzes is dropped."],
  warnings: [],
};

describe("normalizeExtraction", () => {
  it("lower-cases enum values so validation passes", () => {
    const raw = structuredClone(sample) as unknown as { assessments: Record<string, unknown>[] };
    raw.assessments[0].kind = "Assignment";
    raw.assessments[0].confidence = "HIGH";
    raw.assessments[1].kind = "Final Exam";
    const parsed = extractionOutputSchema.safeParse(normalizeExtraction(raw));
    expect(parsed.success).toBe(true);
    expect(parsed.data?.assessments[1].kind).toBe("final_exam");
  });

  it("blanks impossible dates and flags them instead of failing", () => {
    const raw = structuredClone(sample);
    raw.assessments[0].due_date = "2027-02-30";
    const parsed = extractionOutputSchema.parse(normalizeExtraction(raw));
    expect(parsed.assessments[0].due_date).toBe("");
    expect(parsed.assessments[0].confidence).toBe("low");
    expect(parsed.warnings.join(" ")).toMatch(/2027-02-30/);
  });

  it("trims seconds off times and drops invalid ones", () => {
    const raw = structuredClone(sample);
    raw.assessments[0].due_time = "23:59:00";
    raw.assessments[1].due_time = "noon";
    const parsed = extractionOutputSchema.parse(normalizeExtraction(raw));
    expect(parsed.assessments[0].due_time).toBe("23:59");
    expect(parsed.assessments[1].due_time).toBe("");
  });
});

describe("toAssessmentRows", () => {
  it('turns "" and -1 into null and marks every row as a draft', () => {
    const withUnknownWeight = structuredClone(sample);
    withUnknownWeight.assessments[1].weight_percent = -1;
    const rows = toAssessmentRows(withUnknownWeight, { courseId: "c1", syllabusId: "s1" });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      course_id: "c1",
      syllabus_id: "s1",
      due_date: "2027-02-05",
      due_time: "23:59",
      weight_percent: 10,
      notes: null,
      status: "draft",
    });
    expect(rows[1]).toMatchObject({ due_date: null, due_time: null, weight_percent: null, status: "draft" });
  });

  it("skips rows without a title", () => {
    const blank = structuredClone(sample);
    blank.assessments[0].title = "  ";
    expect(toAssessmentRows(blank, { courseId: "c", syllabusId: "s" })).toHaveLength(1);
  });
});
