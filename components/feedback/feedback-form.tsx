"use client";

import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendFeedback } from "@/app/feedback/actions";

/** "Something wrong? Tell us" link that opens a small form (PLAN.md Task 7.6). */
export function FeedbackForm({ syllabusId }: { syllabusId?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [includeSyllabus, setIncludeSyllabus] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        className="self-start text-sm text-muted-foreground underline"
        onClick={() => setOpen(true)}
      >
        Something wrong? Tell us
      </button>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await sendFeedback({
        message,
        page: pathname,
        syllabusId: includeSyllabus && syllabusId ? syllabusId : null,
      });
      setStatus(result);
      if (result.ok) setMessage("");
    });
  }

  return (
    <form onSubmit={submit} className="flex max-w-lg flex-col gap-2 rounded-lg border p-4">
      <label htmlFor="feedback" className="text-sm font-medium">
        What went wrong?
      </label>
      <textarea
        id="feedback"
        className="min-h-24 rounded-md border bg-background p-2 text-sm"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        required
      />
      {syllabusId && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeSyllabus} onChange={(e) => setIncludeSyllabus(e.target.checked)} />
          Include this syllabus so we can look at it
        </label>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
        {status && <p className={status.ok ? "text-sm text-success" : "text-sm text-destructive"}>{status.message}</p>}
      </div>
    </form>
  );
}
