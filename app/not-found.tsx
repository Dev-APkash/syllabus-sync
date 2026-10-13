import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 py-16">
      <p className="text-sm tabular-nums text-muted-foreground">Error 404</p>
      <h1 className="font-serif text-4xl font-medium tracking-tight">This page isn&apos;t on the syllabus</h1>
      <p className="text-muted-foreground">
        The link may be old, or the course may have been deleted. If you followed a calendar link, open your courses
        instead.
      </p>
      <Button asChild>
        <Link href="/dashboard">Go to your courses</Link>
      </Button>
    </div>
  );
}
