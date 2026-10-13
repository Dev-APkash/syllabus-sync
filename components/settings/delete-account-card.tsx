"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "@/app/settings/actions";

export function DeleteAccountCard() {
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      // On success the server redirects to the goodbye page.
      const result = await deleteAccount(confirmation);
      setMessage(result.message);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-card p-5">
      <Label htmlFor="delete-confirmation" className="font-normal text-muted-foreground">
        Type <span className="font-mono font-medium text-foreground">DELETE</span> to confirm
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="delete-confirmation"
          autoComplete="off"
          className="sm:max-w-[14rem]"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <Button type="submit" variant="destructive" disabled={pending || confirmation !== "DELETE"}>
          {pending ? "Deleting…" : "Delete my account"}
        </Button>
      </div>
      {message && <p className="text-sm text-destructive">{message}</p>}
    </form>
  );
}
