// npm run db:types — regenerates types/database.ts from your real database.
// Needs SUPABASE_DB_URL in your env file and Tailscale switched on (PLAN.md Task 2.2).
// Written as a script (not "... > types/database.ts") because older Windows PowerShell
// saves redirected output as UTF-16, which breaks the file.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { requireEnv } from "./load-env";

requireEnv("SUPABASE_DB_URL");

// The shell reads the connection string from the environment itself, so special
// characters in your password never need quoting here, and it's never printed.
const urlRef = process.platform === "win32" ? '"%SUPABASE_DB_URL%"' : '"$SUPABASE_DB_URL"';
const command = `npx --yes supabase@2 gen types typescript --db-url ${urlRef} --schema public`;

const result = spawnSync(command, {
  shell: true,
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
  env: process.env,
});

if (result.status !== 0 || !result.stdout.includes("export type Database")) {
  console.error("Type generation failed:\n" + (result.stderr || result.stdout));
  console.error(
    "\nIf the error mentions Docker: the Supabase CLI needs Docker running for --db-url. " +
      "Either start Docker Desktop, or run the same command on your server (it has Docker).",
  );
  process.exit(1);
}

writeFileSync("types/database.ts", result.stdout, "utf8");
console.log("✓ Wrote types/database.ts");
