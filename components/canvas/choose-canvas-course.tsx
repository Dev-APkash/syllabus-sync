"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { linkCanvasCourse } from "@/app/courses/[id]/actions";

/** "Which Canvas course is this?" with the best match (by course code) chosen already. */
export function ChooseCanvasCourse({
  courseId,
  options,
  suggested,
}: {
  courseId: string;
  options: { id: number; label: string }[];
  suggested: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(suggested ? String(suggested) : "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await linkCanvasCourse({ courseId, canvasCourseId: Number(value) });
      if (result.ok) router.refresh();
      else setMessage(result.message);
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 text-sm">
      <label htmlFor="canvas-course" className="text-muted-foreground">
        Which Canvas course is this?
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          id="canvas-course"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-card px-2 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        >
          <option value="" disabled>
            Choose a course
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending || !value}>
          {pending ? "Saving…" : "Show Canvas info"}
        </Button>
      </div>
      {message && <p className="text-destructive">{message}</p>}
    </form>
  );
}

/** Unlinks the Canvas course so the student can pick a different one. */
export function ChangeCanvasCourseButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-muted-foreground"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await linkCanvasCourse({ courseId, canvasCourseId: null });
          if (result.ok) router.refresh();
        })
      }
    >
      Change course
    </Button>
  );
}
