"use client";

import { Button } from "@/components/ui/button";

// Shown when a page fails to load, e.g. when the home server is offline
// (PLAN.md Task 7.5). In production, Next.js hides the real error from the browser.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-serif text-3xl font-medium tracking-tight">We couldn&apos;t load this page</h1>
      <p className="text-muted-foreground">
        Syllabus Sync may be briefly down for maintenance. Deadlines already in your calendar are still there. Please
        try again in a few minutes.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
