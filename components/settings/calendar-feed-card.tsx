"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetCalendarLink } from "@/app/settings/actions";

const APPS = [
  { name: "Google Calendar", steps: "On a computer: Other calendars → + → From URL → paste the link." },
  { name: "Apple Calendar", steps: "Use the button above, or File → New Calendar Subscription." },
  { name: "Outlook", steps: "Add calendar → Subscribe from web → paste the link." },
];

export function CalendarFeedCard({ feedUrl }: { feedUrl: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");

  async function copy() {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    if (
      !window.confirm("Reset your calendar link? The old link will stop working, so you'll need to subscribe again.")
    ) {
      return;
    }
    startTransition(async () => {
      const result = await resetCalendarLink();
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          readOnly
          value={feedUrl}
          aria-label="Calendar feed link"
          className="font-mono text-xs"
          onFocus={(e) => e.target.select()}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="w-24" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button asChild>
            <a href={webcalUrl}>Add to Apple Calendar</a>
          </Button>
        </div>
      </div>

      <dl className="grid gap-3 text-sm">
        {APPS.map((app) => (
          <div key={app.name} className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <dt className="font-medium">{app.name}</dt>
            <dd className="text-muted-foreground">{app.steps}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        <Button type="button" variant="outline" size="sm" onClick={reset} disabled={pending}>
          {pending ? "Resetting…" : "Reset link"}
        </Button>
        <p className="text-sm text-muted-foreground">{message ?? "Shared the link by mistake? Reset it."}</p>
      </div>
    </div>
  );
}
