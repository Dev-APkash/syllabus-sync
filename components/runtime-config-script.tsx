import { connection } from "next/server";
import { publicSupabaseKey, publicSupabaseUrl, RUNTIME_CONFIG_ID } from "@/lib/runtime-config";

/**
 * Writes the browser's settings (where Supabase is, and its publishable key) into the page,
 * read when the page is served rather than when the app was built, so one Docker image works
 * for every install. A JSON block: browsers never run it, they only read it
 * (lib/supabase/client.ts). Both values are public by design.
 */
export async function RuntimeConfigScript() {
  await connection(); // read at request time, not during the build
  const url = publicSupabaseUrl();
  const key = publicSupabaseKey();
  if (!url || !key) return null;
  // "<" escaped so the value can never close the script element early.
  const json = JSON.stringify({ url, key }).replace(/</g, "\\u003c");
  return <script id={RUNTIME_CONFIG_ID} type="application/json" dangerouslySetInnerHTML={{ __html: json }} />;
}
