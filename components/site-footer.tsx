import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="h-5 w-5" />
          <span>Syllabus Sync</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <ThemeSwitcher />
        </div>
      </div>
    </footer>
  );
}
