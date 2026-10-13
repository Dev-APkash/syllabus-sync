"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReviewCourse } from "@/lib/review/schema";

const FIELDS: { key: keyof ReviewCourse; label: string; type?: string; placeholder?: string }[] = [
  { key: "code", label: "Course code", placeholder: "PSYC 1010" },
  { key: "name", label: "Course name" },
  { key: "term", label: "Term", placeholder: "Winter 2027" },
  { key: "instructor", label: "Instructor" },
  { key: "term_start_date", label: "First day of classes", type: "date" },
];

export function CourseFields({ course, onChange }: { course: ReviewCourse; onChange: (c: ReviewCourse) => void }) {
  return (
    <section className="rounded-lg border bg-card">
      <h2 className="border-b px-4 py-2.5 text-sm font-medium">Course details</h2>
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((field) => (
          <div key={field.key} className="grid gap-1.5">
            <Label htmlFor={`course-${field.key}`} className="text-xs text-muted-foreground">
              {field.label}
            </Label>
            <Input
              id={`course-${field.key}`}
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              value={course[field.key]}
              onChange={(e) => onChange({ ...course, [field.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
