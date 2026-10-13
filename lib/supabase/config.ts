// Where Supabase lives, for each place our code runs.
//
// On Vercel the browser and the server use the same public address.
// In the self-hosted Docker setup (selfhost/), the server can reach Supabase
// directly inside Docker at SUPABASE_INTERNAL_URL (http://api-gw:8000), which
// the browser can't. These helpers keep the two consistent. The public address
// is read at runtime (lib/runtime-config.ts), so one image fits every install.
import { publicSupabaseUrl } from "@/lib/runtime-config";

/**
 * A fixed name for the login cookie. By default the Supabase library names it
 * after the address's hostname, so the browser (public address) and the server
 * (internal address) would look for different cookies and never see each other's login.
 */
export const AUTH_COOKIE_NAME = "sb-syllabus-sync-auth-token";

/** The address server code uses: the internal one when it's set, otherwise the public one. */
export function serverSupabaseUrl(): string {
  return process.env.SUPABASE_INTERNAL_URL || publicSupabaseUrl()!;
}

/**
 * Links created on the server (e.g. a signed PDF link) point at the internal
 * address. This swaps it for the public one so the browser can open them.
 */
export function toPublicUrl(
  url: string,
  internalBase = process.env.SUPABASE_INTERNAL_URL,
  publicBase = publicSupabaseUrl(),
): string {
  if (!internalBase || !publicBase) return url;
  const internal = internalBase.replace(/\/+$/, "");
  const external = publicBase.replace(/\/+$/, "");
  return url.startsWith(internal) ? external + url.slice(internal.length) : url;
}
