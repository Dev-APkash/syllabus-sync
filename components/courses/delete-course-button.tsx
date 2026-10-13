"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteCourse } from "@/app/courses/[id]/actions";

/** "Delete course": asks first, then the server deletes it and goes back to the course list. */
export function DeleteCourseButton({ courseId, label }: { courseId: string; label: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (
      !window.confirm(
        `Delete ${label}? Its deadlines and PDF are deleted and leave your calendar. This can't be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      // On success the server redirects to the course list.
      const result = await deleteCourse(courseId);
      setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="hover:text-destructive"
        onClick={remove}
        disabled={pending}
      >
        {pending ? "Deleting…" : "Delete course"}
      </Button>
      {message && <p className="text-sm text-destructive">{message}</p>}
    </div>
  );
}
