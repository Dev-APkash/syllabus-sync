import { COURSE_COLORS, type CourseColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Written out in full so Tailwind sees every class name (it can't read built-up strings).
export const COURSE_COLOR_CLASSES: Record<CourseColor, string> = {
  green: "bg-course-green",
  blue: "bg-course-blue",
  violet: "bg-course-violet",
  rose: "bg-course-rose",
  amber: "bg-course-amber",
  teal: "bg-course-teal",
  orange: "bg-course-orange",
  slate: "bg-course-slate",
};

export const toCourseColor = (value: string | null | undefined): CourseColor =>
  (COURSE_COLORS as readonly string[]).includes(value ?? "") ? (value as CourseColor) : "slate";

/** A small dot in the course's colour. Always shown next to the course code, never alone. */
export function CourseDot({ color, className }: { color: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        COURSE_COLOR_CLASSES[toCourseColor(color)],
        className,
      )}
    />
  );
}
