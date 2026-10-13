"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setCourseColor } from "@/app/courses/[id]/actions";
import { COURSE_COLORS, type CourseColor } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { COURSE_COLOR_CLASSES } from "./course-dot";

/** Eight swatches; clicking one recolours the course everywhere it appears. */
export function ColorPicker({ courseId, current }: { courseId: string; current: CourseColor }) {
  const router = useRouter();
  const [selected, setSelected] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(color: CourseColor) {
    setSelected(color); // show it straight away; undone below if saving fails
    setError(null);
    startTransition(async () => {
      const result = await setCourseColor({ courseId, color });
      if (result.ok) router.refresh();
      else {
        setSelected(current);
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Course colour">
        {COURSE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            disabled={pending}
            aria-label={color}
            aria-pressed={selected === color}
            onClick={() => choose(color)}
            className={cn(
              "h-6 w-6 rounded-full ring-offset-2 ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              COURSE_COLOR_CLASSES[color],
              selected === color ? "ring-2 ring-foreground" : "opacity-80 hover:opacity-100",
            )}
          />
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
