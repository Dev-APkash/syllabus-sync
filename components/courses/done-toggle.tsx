"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setDone } from "@/app/courses/[id]/actions";

/** A tick box that marks a deadline as done (or not). Shows the change straight away. */
export function DoneToggle({ assessmentId, title, done }: { assessmentId: string; title: string; done: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(done);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      const result = await setDone({ assessmentId, done: next });
      if (result.ok) router.refresh();
      else setChecked(!next); // undo if it didn't save
    });
  }

  return (
    <input
      type="checkbox"
      aria-label={checked ? `Mark ${title} as not done` : `Mark ${title} as done`}
      className="h-4 w-4 shrink-0 cursor-pointer accent-[hsl(var(--primary))]"
      checked={checked}
      disabled={pending}
      onChange={(e) => toggle(e.target.checked)}
    />
  );
}
