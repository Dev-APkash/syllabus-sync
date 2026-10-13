import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { decryptToken, parseKey } from "./crypto";
import { nextPageUrl } from "./schema";

// Talks to Canvas with the student's own token, on the server only. The token is never
// logged and never sent to the browser. Only GET requests: the app never changes Canvas.

const TIMEOUT_MS = 10_000;
const MAX_PAGES = 10; // 10 × 100 items is far more than any course has

export type CanvasErrorKind = "unauthorized" | "unreachable" | "bad_response";

export class CanvasError extends Error {
  constructor(public kind: CanvasErrorKind) {
    super(`Canvas request failed: ${kind}`);
  }
}

/** What the student sees when a Canvas request fails. */
export function canvasErrorMessage(error: unknown): string {
  const kind = error instanceof CanvasError ? error.kind : "bad_response";
  if (kind === "unauthorized") {
    return "Canvas didn't accept the token. It may have expired or been deleted: create a new one and link Canvas again.";
  }
  if (kind === "unreachable") return "Couldn't reach Canvas. Check the address, or try again in a minute.";
  return "Canvas gave an answer we didn't expect. Try again in a minute.";
}

export type CanvasConnection = { baseUrl: string; token: string; userName: string | null };

/** Is Canvas linking set up on this server (is there an encryption key)? */
export const canvasAvailable = () => parseKey(process.env.CANVAS_TOKEN_KEY) !== null;

/** The student's Canvas link with the token decrypted, or why there isn't one. */
export async function getCanvasConnection(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CanvasConnection | { error: "no_key" | "not_linked" | "undecryptable" }> {
  const key = parseKey(process.env.CANVAS_TOKEN_KEY);
  if (!key) return { error: "no_key" };
  const { data } = await supabase
    .from("canvas_connections")
    .select("base_url, token_encrypted, canvas_user_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { error: "not_linked" };
  const token = decryptToken(data.token_encrypted, key);
  if (!token) return { error: "undecryptable" }; // e.g. the server's key was changed
  return { baseUrl: data.base_url, token, userName: data.canvas_user_name };
}

async function request(baseUrl: string, token: string, pathOrUrl: string): Promise<Response> {
  const url = new URL(pathOrUrl, baseUrl);
  // Never send the token anywhere except the student's own Canvas server.
  if (url.origin !== baseUrl) throw new CanvasError("bad_response");
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new CanvasError("unreachable");
  }
  if (response.status === 401) throw new CanvasError("unauthorized");
  if (!response.ok) throw new CanvasError("bad_response");
  return response;
}

/** One Canvas API answer, as unvalidated JSON (callers check it with Zod). */
export async function canvasGet(conn: Pick<CanvasConnection, "baseUrl" | "token">, path: string): Promise<unknown> {
  const response = await request(conn.baseUrl, conn.token, path);
  return response.json().catch(() => {
    throw new CanvasError("bad_response");
  });
}

/** Every page of a Canvas list (Canvas splits long lists and links to the next page). */
export async function canvasGetAll(
  conn: Pick<CanvasConnection, "baseUrl" | "token">,
  path: string,
): Promise<unknown[]> {
  const items: unknown[] = [];
  let next: string | null = path;
  for (let page = 0; next && page < MAX_PAGES; page++) {
    const response = await request(conn.baseUrl, conn.token, next);
    const body: unknown = await response.json().catch(() => null);
    if (!Array.isArray(body)) throw new CanvasError("bad_response");
    items.push(...body);
    next = nextPageUrl(response.headers.get("link"));
  }
  return items;
}
