// Values shared by the database, the AI schema and the UI. Must match the
// check constraints in supabase/migrations/0001_initial_schema.sql.

export const ASSESSMENT_KINDS = [
  "assignment",
  "quiz",
  "test",
  "midterm",
  "final_exam",
  "project",
  "lab",
  "presentation",
  "participation",
  "other",
] as const;
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];

export const KIND_LABELS: Record<AssessmentKind, string> = {
  assignment: "Assignment",
  quiz: "Quiz",
  test: "Test",
  midterm: "Midterm",
  final_exam: "Final exam",
  project: "Project",
  lab: "Lab",
  presentation: "Presentation",
  participation: "Participation",
  other: "Other",
};

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const SYLLABUS_STATUSES = ["uploaded", "extracting", "needs_review", "confirmed", "failed"] as const;
export type SyllabusStatus = (typeof SYLLABUS_STATUSES)[number];

export const STATUS_LABELS: Record<SyllabusStatus, string> = {
  uploaded: "Uploaded",
  extracting: "Reading…",
  needs_review: "Needs review",
  confirmed: "Confirmed",
  failed: "Failed",
};

// Course colours (migration 0005 and the --course-* tokens in app/globals.css).
export const COURSE_COLORS = ["green", "blue", "violet", "rose", "amber", "teal", "orange", "slate"] as const;
export type CourseColor = (typeof COURSE_COLORS)[number];

// The assessment kinds shown in the dashboard's "Exams" panel.
export const EXAM_KINDS: readonly AssessmentKind[] = ["midterm", "test", "final_exam"];

export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB, same as the storage bucket
export const MAX_PDF_PAGES = 30;
export const MAX_RUNS_PER_SYLLABUS = 3;
export const SYLLABI_BUCKET = "syllabi";
// Also enforce this on the server (see "Auth hardening" in infra/README.md).
export const MIN_PASSWORD_LENGTH = 8;
