import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { serverSupabaseUrl } from "./config";

/**
 * A Supabase client that uses the SECRET key, so it BYPASSES Row Level Security.
 * "server-only" above makes the build fail if browser code ever imports this file.
 *
 * Only two places may use it (CLAUDE.md):
 *   - the calendar feed (app/api/calendar/[token]/route.ts)
 *   - account deletion (app/settings/actions.ts)
 * Every query made with it must filter by user_id explicitly.
 */
export function createAdminClient() {
  return createClient<Database>(
    serverSupabaseUrl(),
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
