"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeUpload } from "@/app/dashboard/actions";

/** "Remove" for an upload that failed to read: deletes it and its PDF from the course list. */
export function RemoveUploadButton({ syllabusId }: { syllabusId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Remove this upload? Its PDF is deleted too.")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await removeUpload(syllabusId);
      if (result.ok) router.refresh();
      else setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        onClick={remove}
        disabled={pending}
      >
        <Trash2 aria-hidden="true" />
        {pending ? "Removing…" : "Remove"}
      </Button>
      {message && <p className="max-w-xs text-xs text-destructive md:text-right">{message}</p>}
    </div>
  );
}
