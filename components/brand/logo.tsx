import { cn } from "@/lib/utils";

/** The Syllabus Sync mark: a calendar page with one deadline blocked in. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("h-6 w-6", className)} fill="none">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="12.5" y="13" width="5" height="4" rx="0.75" className="fill-primary" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-serif text-lg font-medium tracking-tight">Syllabus Sync</span>
    </span>
  );
}
