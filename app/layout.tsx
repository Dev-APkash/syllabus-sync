import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { RuntimeConfigScript } from "@/components/runtime-config-script";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: { default: "Syllabus Sync", template: "%s · Syllabus Sync" },
  description:
    "Upload your course syllabi and get every deadline, exam and grade weight into your calendar in under a minute.",
};

// Interface text: IBM Plex Sans. Headings: Newsreader, a serif that suits academic documents.
// Self-hosted from app/fonts (see the README there), so there's no Google Fonts dependency.
const sans = localFont({
  src: "./fonts/ibm-plex-sans-latin-variable.woff2",
  variable: "--font-sans",
  weight: "100 700",
  display: "swap",
});
const serif = localFont({
  src: "./fonts/newsreader-latin-variable.woff2",
  variable: "--font-serif",
  weight: "300 700",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {/* Hidden until focused with the keyboard: lets keyboard users jump past the header. */}
          <a
            href="#main"
            className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
          >
            Skip to content
          </a>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6">
              {children}
            </main>
            <SiteFooter />
          </div>
        </ThemeProvider>
        {/* Where the browser finds Supabase, read per request (one image fits every install). */}
        <Suspense fallback={null}>
          <RuntimeConfigScript />
        </Suspense>
        {/* Page views only; no cookies or personal data (PLAN.md Task 7.6). Vercel only: self-hosted
            copies (Docker builds don't set VERCEL) send nothing anywhere. */}
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
