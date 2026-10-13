"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { startExtraction } from "@/components/extraction/start-extraction";

/** "Try again" for a syllabus whose reading failed (or never started). */
export function RetryButton({ syllabusId, label = "Try again" }: { syllabusId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setMessage(null);
    const result = await startExtraction(syllabusId);
    if (result.ok) {
      router.push(`/syllabi/${syllabusId}/review`);
    } else {
      setMessage(result.message);
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      <Button size="sm" variant="outline" onClick={retry} disabled={busy}>
        {busy ? "Reading… (1–3 min)" : label}
      </Button>
      {message && <p className="max-w-xs text-xs md:text-right text-destructive">{message}</p>}
    </div>
  );
}
