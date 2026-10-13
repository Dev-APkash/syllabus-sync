import { cn } from "@/lib/utils";

/** A grey placeholder shape shown while content loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/** Placeholder for a list or table of rows. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="overflow-hidden rounded-lg border bg-card">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b px-5 py-4 last:border-0">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-4 w-20 sm:block" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}
