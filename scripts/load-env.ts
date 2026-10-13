// Loads the settings from your local env file into process.env for terminal scripts.
// (Next.js does this automatically for the app; plain scripts need this helper.)
import { existsSync } from "node:fs";

const ENV_FILE = ".env.local";
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

/** Reads a required setting, or stops the script with a clear message. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Add it to ${ENV_FILE} (see .env.example).`);
    process.exit(1);
  }
  return value;
}
