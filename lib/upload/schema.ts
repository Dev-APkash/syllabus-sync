import { z } from "zod";

// The text fields on the upload form (the file is checked by validate-file.ts).
export const uploadFieldsSchema = z.object({
  courseCode: z.string().trim().max(40, "Course code is too long."),
  term: z.string().trim().min(1, "Enter the term, e.g. Winter 2027.").max(40, "Term is too long."),
  // "" when the student leaves it empty. The AI then leaves relative dates blank.
  termStartDate: z.union([z.iso.date(), z.literal("")]),
});

export type UploadFields = z.infer<typeof uploadFieldsSchema>;
