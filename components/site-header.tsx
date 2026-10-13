import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { Wordmark } from "@/components/brand/logo";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasSupabaseConfig } from "@/lib/runtime-config";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 w-full border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Syllabus Sync home">
          <Wordmark />
        </Link>
        <Suspense fallback={null}>
          <HeaderAccount />
        </Suspense>
      </div>
    </header>
  );
}

/** Checked per request, not at build time, so a published image shows the right thing. */
async function HeaderAccount() {
  await connection();
  return hasSupabaseConfig() ? <AuthButton /> : <EnvVarWarning />;
}
