import { createBrowserClient } from "@supabase/ssr";
import { browserConfigSchema, RUNTIME_CONFIG_ID, type BrowserConfig } from "@/lib/runtime-config";
import type { Database } from "@/types/database";
import { AUTH_COOKIE_NAME } from "./config";

/**
 * Where the browser finds Supabase. The Vercel build has it baked in (NEXT_PUBLIC_*); the
 * self-hosted image doesn't, so the server writes it into every page when it's served
 * (components/runtime-config-script.tsx). Only public values: the address and the publishable key.
 */
function browserConfig(): BrowserConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) return { url, key };

  const text = document.getElementById(RUNTIME_CONFIG_ID)?.textContent ?? "null";
  let parsed;
  try {
    parsed = browserConfigSchema.safeParse(JSON.parse(text));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) {
    throw new Error("Syllabus Sync isn't set up: the server has no SITE_URL or SUPABASE_PUBLISHABLE_KEY.");
  }
  return parsed.data;
}

/** The browser's Supabase client. Call it in event handlers and effects, not while rendering. */
export function createClient() {
  const { url, key } = browserConfig();
  return createBrowserClient<Database>(url, key, { cookieOptions: { name: AUTH_COOKIE_NAME } });
}
