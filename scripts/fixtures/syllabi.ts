// Four INVENTED syllabi (all names, courses and schools are made up) and their answer keys.
// Every one assumes the first day of classes is Monday 4 January 2027.
// Kept ASCII-only because the PDF's built-in font can't draw every character.
import type { AssessmentOutput, ExtractionOutput } from "../../lib/extraction/schema";

export type Block = { heading?: string; text?: string; table?: string[][] };
export type Fixture = { name: string; title: string[]; blocks: Block[]; expected: ExtractionOutput };

function item(
  title: string,
  kind: AssessmentOutput["kind"],
  due_date: string,
  due_time: string,
  weight_percent: number,
  date_text: string,
  notes = "",
): AssessmentOutput {
  return { title, kind, due_date, due_time, weight_percent, date_text, source_quote: "", confidence: "high", notes };
}

const readings: Block = {
  heading: "Readings",
  text: "Weekly readings are listed on the course site. Readings are not graded, but you will need them for the tests.",
};

export const FIXTURES: Fixture[] = [
  {
    name: "clean",
    title: ["HIST 2100: World History since 1500", "Winter 2027 - Dr. Mara Okonkwo - Northfield College"],
    blocks: [
      { text: "This course surveys global history from 1500 to the present through primary sources and short essays." },
      {
        heading: "Assessment schedule",
        table: [
          ["Assessment", "Due", "Weight"],
          ["Map Quiz", "Friday, January 15, 2027", "5%"],
          ["Primary Source Analysis", "Friday, January 29, 2027, 11:59 pm", "15%"],
          ["Midterm Exam (in class)", "Wednesday, February 24, 2027, 10:00 am", "25%"],
          ["Research Proposal", "Friday, March 12, 2027, 11:59 pm", "10%"],
          ["Research Essay", "Friday, April 2, 2027, 11:59 pm", "25%"],
          ["Final Exam", "Tuesday, April 20, 2027, 9:00 am", "20%"],
        ],
      },
      readings,
    ],
    expected: {
      course: {
        code: "HIST 2100",
        name: "World History since 1500",
        instructor: "Dr. Mara Okonkwo",
        term: "Winter 2027",
      },
      assessments: [
        item("Map Quiz", "quiz", "2027-01-15", "", 5, "Friday, January 15, 2027"),
        item("Primary Source Analysis", "assignment", "2027-01-29", "23:59", 15, "Friday, January 29, 2027, 11:59 pm"),
        item("Midterm Exam", "midterm", "2027-02-24", "10:00", 25, "Wednesday, February 24, 2027, 10:00 am"),
        item("Research Proposal", "assignment", "2027-03-12", "23:59", 10, "Friday, March 12, 2027, 11:59 pm"),
        item("Research Essay", "assignment", "2027-04-02", "23:59", 25, "Friday, April 2, 2027, 11:59 pm"),
        item("Final Exam", "final_exam", "2027-04-20", "09:00", 20, "Tuesday, April 20, 2027, 9:00 am"),
      ],
      grading_notes: [],
      warnings: [],
    },
  },
  {
    name: "paragraphs",
    title: ["BIOL 1500: Cell Biology", "Winter 2027 - Dr. Priya Lindqvist - Lakeshore University"],
    blocks: [
      {
        heading: "Laboratory work",
        text: "There are two formal lab reports, each worth 10% of your final grade. The first lab report is due on Thursday, February 4, 2027 at 5:00 pm, and the second lab report is due on Thursday, March 11, 2027 at 5:00 pm. Reports are submitted online.",
      },
      {
        heading: "Tests",
        text: "A midterm test worth 20% will be written in class on Monday, February 22, 2027. It covers material from weeks 1 to 6. The final examination, worth 40%, will be held during the April examination period; the date will be announced by the Registrar.",
      },
      {
        heading: "Group work and participation",
        text: "Each group gives a short presentation in class on Wednesday, March 31, 2027. The presentation is worth 15% of the final grade. Participation in tutorials counts for the remaining 5% and is assessed throughout the term.",
      },
      readings,
    ],
    expected: {
      course: { code: "BIOL 1500", name: "Cell Biology", instructor: "Dr. Priya Lindqvist", term: "Winter 2027" },
      assessments: [
        item("Lab Report 1", "lab", "2027-02-04", "17:00", 10, "Thursday, February 4, 2027 at 5:00 pm"),
        item("Lab Report 2", "lab", "2027-03-11", "17:00", 10, "Thursday, March 11, 2027 at 5:00 pm"),
        item("Midterm Test", "midterm", "2027-02-22", "", 20, "Monday, February 22, 2027"),
        item("Group Presentation", "presentation", "2027-03-31", "", 15, "Wednesday, March 31, 2027"),
        item("Participation", "participation", "", "", 5, "Assessed throughout the term"),
        item(
          "Final Exam",
          "final_exam",
          "",
          "",
          40,
          "During the April examination period",
          "Date set by the Registrar",
        ),
      ],
      grading_notes: [],
      warnings: [],
    },
  },
  {
    name: "relative-weeks",
    title: ["PSYC 1010: Introduction to Psychology", "Winter 2027 - Dr. Alex Rivera - Hillcrest University"],
    blocks: [
      {
        heading: "Important dates",
        text: "All dates are given by week of term. Week 1 begins on the first day of classes. Reading week (no classes) falls after Week 6, so Week 7 begins on the Monday after reading week.",
      },
      {
        heading: "Evaluation",
        table: [
          ["Assessment", "When", "Weight"],
          ["Research Summary 1", "Friday of Week 3, by 11:59 pm", "10%"],
          ["Quiz 1", "Wednesday of Week 5, in lecture", "5%"],
          ["Midterm Exam", "Monday of Week 7, in lecture", "25%"],
          ["Research Summary 2", "Friday of Week 9, by 11:59 pm", "10%"],
          ["Quiz 2", "Wednesday of Week 11, in lecture", "5%"],
          ["Final Exam", "Scheduled by the Registrar during the exam period", "45%"],
        ],
      },
      readings,
    ],
    expected: {
      course: {
        code: "PSYC 1010",
        name: "Introduction to Psychology",
        instructor: "Dr. Alex Rivera",
        term: "Winter 2027",
      },
      assessments: [
        item("Research Summary 1", "assignment", "2027-01-22", "23:59", 10, "Friday of Week 3, by 11:59 pm"),
        item("Quiz 1", "quiz", "2027-02-03", "", 5, "Wednesday of Week 5, in lecture"),
        item("Midterm Exam", "midterm", "2027-02-22", "", 25, "Monday of Week 7, in lecture"),
        item("Research Summary 2", "assignment", "2027-03-12", "23:59", 10, "Friday of Week 9, by 11:59 pm"),
        item("Quiz 2", "quiz", "2027-03-24", "", 5, "Wednesday of Week 11, in lecture"),
        item("Final Exam", "final_exam", "", "", 45, "Scheduled by the Registrar during the exam period"),
      ],
      grading_notes: [],
      warnings: [],
    },
  },
  {
    name: "messy-grading",
    title: ["CHEM 1100: General Chemistry I", "Winter 2027 - Dr. Samir Haddad - Riverbend Polytechnic"],
    blocks: [
      {
        heading: "Grading (500 points total)",
        table: [
          ["Component", "Points"],
          ["Quizzes (best 4 of 5, 20 points each)", "80"],
          ["Lab reports (2 x 50 points)", "100"],
          ["Midterm exam", "120"],
          ["Final exam", "200"],
          ["Total", "500"],
        ],
      },
      {
        heading: "Quizzes",
        text: "Quizzes are written online on these Fridays: January 22, February 5, February 26, March 12 and March 26, 2027. Only your best four quiz scores count.",
      },
      {
        heading: "Lab reports",
        text: "Lab reports are due at the start of your lab session. Section L01 (Tuesdays): Lab Report 1 on February 2, 2027 and Lab Report 2 on March 16, 2027. Section L02 (Thursdays): Lab Report 1 on February 4, 2027 and Lab Report 2 on March 18, 2027.",
      },
      {
        heading: "Exams",
        text: "The midterm exam is on Thursday, February 25, 2027 at 7:00 pm. The final exam is scheduled during the April exam period; date TBA.",
      },
    ],
    expected: {
      course: { code: "CHEM 1100", name: "General Chemistry I", instructor: "Dr. Samir Haddad", term: "Winter 2027" },
      assessments: [
        // 80 of 500 points = 16%, shared equally across the 5 quizzes (extraction rule 5)
        item("Quiz 1", "quiz", "2027-01-22", "", 3.2, "January 22", "Best 4 of 5 count"),
        item("Quiz 2", "quiz", "2027-02-05", "", 3.2, "February 5", "Best 4 of 5 count"),
        item("Quiz 3", "quiz", "2027-02-26", "", 3.2, "February 26", "Best 4 of 5 count"),
        item("Quiz 4", "quiz", "2027-03-12", "", 3.2, "March 12", "Best 4 of 5 count"),
        item("Quiz 5", "quiz", "2027-03-26", "", 3.2, "March 26, 2027", "Best 4 of 5 count"),
        // Section-dependent dates: one row per item, earliest date (extraction rule 6)
        item("Lab Report 1", "lab", "2027-02-02", "", 10, "February 2, 2027", "L01 Feb 2, L02 Feb 4"),
        item("Lab Report 2", "lab", "2027-03-16", "", 10, "March 16, 2027", "L01 Mar 16, L02 Mar 18"),
        item("Midterm Exam", "midterm", "2027-02-25", "19:00", 24, "Thursday, February 25, 2027 at 7:00 pm"),
        item("Final Exam", "final_exam", "", "", 40, "During the April exam period; date TBA"),
      ],
      grading_notes: ["Only the best 4 of 5 quizzes count."],
      warnings: ["Lab report dates depend on your lab section."],
    },
  },
];
