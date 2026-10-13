// Settings that differ per install, read when the app runs (not when it's built), so one
// published Docker image works for everyone (RELEASE_PLAN.md "Design: runtime configuration").
//
// Names are looked up dynamically (env[name]) on purpose: Next.js only bakes in
// `process.env.NEXT_PUBLIC_…` when written out literally, so these are always read at runtime.
// The NEXT_PUBLIC_* names are the fallback for the Vercel app, where they're set too.
import { z } from "zod";

type Env = Record<string, string | undefined>;

const read = (env: Env, ...names: string[]) => {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
};
const withoutSlash = (url: string) => url.replace(/\/+$/, "");

/** The address students open the app at, e.g. "https://syllabus.example.ts.net". */
export function siteUrl(env: Env = process.env): string {
  return withoutSlash(read(env, "SITE_URL", "NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000");
}

/** Where the browser reaches Supabase. Self-hosted: the same address as the app (Caddy routes it). */
export function publicSupabaseUrl(env: Env = process.env): string | undefined {
  const url = read(env, "SUPABASE_PUBLIC_URL", "NEXT_PUBLIC_SUPABASE_URL", "SITE_URL");
  return url ? withoutSlash(url) : undefined;
}

/** Supabase's publishable ("anon") key. Public by design: RLS protects the data, not this key. */
export function publicSupabaseKey(env: Env = process.env): string | undefined {
  return read(env, "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

export function hasSupabaseConfig(env: Env = process.env): boolean {
  return Boolean(publicSupabaseUrl(env) && publicSupabaseKey(env));
}

/** The page element the server writes the browser's settings into (app/layout.tsx). */
export const RUNTIME_CONFIG_ID = "runtime-config";
export const browserConfigSchema = z.object({ url: z.url(), key: z.string().min(1) });
export type BrowserConfig = z.infer<typeof browserConfigSchema>;

/**
 * Server Actions only accept a request whose Origin matches its Host (or X-Forwarded-Host).
 * If a proxy in front rewrote the Host header, a request from our own address would be
 * refused. Returns the host to treat it as, but only when the Origin is exactly our own
 * configured address; requests from anywhere else are left alone (and still refused).
 */
export function hostOverride(
  origin: string | null,
  host: string | null,
  forwardedHost: string | null,
  site: string,
): string | null {
  if (!origin) return null;
  let originHost: string;
  let siteHost: string;
  try {
    originHost = new URL(origin).host;
    siteHost = new URL(site).host;
  } catch {
    return null;
  }
  if (originHost !== siteHost) return null;
  if ((forwardedHost ?? host) === siteHost) return null;
  return siteHost;
}
