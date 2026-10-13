import Link from "next/link";
import { Button } from "./ui/button";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
import { SiteNav } from "./site-nav";

// The right-hand side of the header. It reads the login cookie, so it must
// always be rendered inside a <Suspense> boundary (Cache Components rule).
export async function AuthButton() {
  const user = await getCurrentUser();

  return user ? (
    <div className="flex items-center gap-2">
      <SiteNav />
      <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
      <LogoutButton />
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="ghost">
        <Link href="/auth/login">Log in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/auth/sign-up">Create account</Link>
      </Button>
    </div>
  );
}
