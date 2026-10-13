"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deletePdf } from "@/app/courses/[id]/actions";

export function DeletePdfButton({ syllabusId }: { syllabusId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Delete the uploaded PDF? Your confirmed deadlines stay.")) return;
    startTransition(async () => {
      const result = await deletePdf(syllabusId);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" size="sm" variant="outline" onClick={remove} disabled={pending}>
        {pending ? "Deleting…" : "Delete the PDF"}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
