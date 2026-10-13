"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectCanvas, disconnectCanvas } from "@/app/settings/actions";

type Props = {
  /** Set when Canvas is already linked. */
  linked: { host: string; userName: string | null; since: string } | null;
};

export function CanvasCard({ linked }: Props) {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function link(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const outcome = await connectCanvas({ baseUrl, token });
      setResult(outcome);
      if (outcome.ok) {
        setToken(""); // don't keep the token in the page any longer than needed
        router.refresh();
      }
    });
  }

  function unlink() {
    if (!window.confirm("Unlink Canvas? Your grades from Canvas will no longer show here.")) return;
    startTransition(async () => {
      setResult(await disconnectCanvas());
      router.refresh();
    });
  }

  if (linked) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-5 text-sm">
        <p>
          Linked to <span className="font-medium">{linked.host}</span>
          {linked.userName && <> as {linked.userName}</>} since <span className="tabular-nums">{linked.since}</span>.
        </p>
        <p className="text-muted-foreground">
          To stop access completely, also delete the token in Canvas under Account → Settings → Approved integrations.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={unlink} disabled={pending}>
            {pending ? "Unlinking…" : "Unlink Canvas"}
          </Button>
          {result && <p className={result.ok ? "text-success" : "text-destructive"}>{result.message}</p>}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={link} className="flex flex-col gap-4 rounded-lg border bg-card p-5 text-sm">
      <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
        <li>In Canvas, open Account → Settings and choose New access token.</li>
        <li>For the purpose, write &ldquo;Syllabus Sync&rdquo;. Set it to expire at the end of term.</li>
        <li>Generate the token, copy it, and paste it below. Canvas shows it only once.</li>
      </ol>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="canvas-url">Canvas address</Label>
          <Input
            id="canvas-url"
            placeholder="canvas.yourschool.edu"
            autoComplete="url"
            required
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="canvas-token">Access token</Label>
          <Input
            id="canvas-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
      </div>
      <p className="text-muted-foreground">
        The token is checked with Canvas, then stored encrypted. Syllabus Sync only reads your courses, assignments and
        grades; it never changes anything in Canvas.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Checking with Canvas…" : "Link Canvas"}
        </Button>
        {result && <p className={result.ok ? "text-success" : "text-destructive"}>{result.message}</p>}
      </div>
    </form>
  );
}
