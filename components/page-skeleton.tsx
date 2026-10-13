import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder shaped like a page: a title block, then rows. */
export function PageSkeleton({ withHeader = true, rows = 4 }: { withHeader?: boolean; rows?: number }) {
  return (
    <div className="flex flex-col">
      {withHeader && (
        <div className="mb-8 flex flex-col gap-3 border-b pb-6">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      )}
      <ListSkeleton rows={rows} />
    </div>
  );
}
