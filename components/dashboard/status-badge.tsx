import { STATUS_LABELS, type SyllabusStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const DOTS: Record<SyllabusStatus, string> = {
  uploaded: "bg-muted-foreground/50",
  extracting: "bg-primary animate-pulse",
  needs_review: "bg-warning",
  confirmed: "bg-success",
  failed: "bg-destructive",
};

/** A quiet status label: coloured dot plus text. */
export function StatusBadge({ status }: { status: string }) {
  const known = (status in STATUS_LABELS ? status : "uploaded") as SyllabusStatus;
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", DOTS[known])} aria-hidden="true" />
      {STATUS_LABELS[known]}
    </span>
  );
}
