"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { canvasErrorMessage, canvasGet } from "@/lib/canvas/api";
import { encryptToken, parseKey } from "@/lib/canvas/crypto";
import { canvasTokenSchema, canvasUserSchema, normalizeCanvasUrl } from "@/lib/canvas/schema";
import { SYLLABI_BUCKET } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; message: string };

const connectSchema = z.object({ baseUrl: z.string().max(200), token: canvasTokenSchema });

/**
 * "Link Canvas": checks the token works (asks Canvas who it belongs to), then stores it
 * encrypted. The token is never logged, returned or stored as plain text.
 */
export async function connectCanvas(input: unknown): Promise<Result> {
  const parsed = connectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the token." };
  const baseUrl = normalizeCanvasUrl(parsed.data.baseUrl);
  if (!baseUrl) return { ok: false, message: "Enter your Canvas address, like canvas.yourschool.edu (https only)." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };
  const key = parseKey(process.env.CANVAS_TOKEN_KEY);
  if (!key) return { ok: false, message: "Canvas linking isn't set up on this server yet (CANVAS_TOKEN_KEY)." };

  let name: string;
  try {
    const me = canvasUserSchema.safeParse(await canvasGet({ baseUrl, token: parsed.data.token }, "/api/v1/users/self"));
    if (!me.success) return { ok: false, message: "That address doesn't look like a Canvas server." };
    name = me.data.name.slice(0, 200);
  } catch (error) {
    return { ok: false, message: canvasErrorMessage(error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("canvas_connections").upsert(
    {
      user_id: user.id,
      base_url: baseUrl,
      token_encrypted: encryptToken(parsed.data.token, key),
      canvas_user_name: name,
    },
    { onConflict: "user_id" },
  );
  return error
    ? { ok: false, message: "Couldn't save the link. Please try again." }
    : { ok: true, message: `Linked to Canvas as ${name}.` };
}

/** "Unlink Canvas": deletes the stored token. (The student can also delete it in Canvas.) */
export async function disconnectCanvas(): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };
  const supabase = await createClient();
  const { error } = await supabase.from("canvas_connections").delete().eq("user_id", user.id);
  return error
    ? { ok: false, message: "Couldn't unlink Canvas. Please try again." }
    : { ok: true, message: "Canvas unlinked." };
}

/** "Reset link": a new random calendar token; the old feed URL stops working. */
export async function resetCalendarLink(): Promise<{ ok: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in again." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ calendar_token: randomBytes(32).toString("hex") }) // 64 random hex characters
    .eq("id", user.id);
  return error
    ? { ok: false, message: "Couldn't reset the link. Please try again." }
    : { ok: true, message: "New link created. Re-subscribe in your calendar app with the new link." };
}

/**
 * "Delete my account" (PLAN.md Task 7.3). The admin client is used ONLY here,
 * after verifying the user, and only for this user's own id.
 */
export async function deleteAccount(confirmation: unknown): Promise<{ ok: boolean; message: string }> {
  if (!z.literal("DELETE").safeParse(confirmation).success) {
    return { ok: false, message: "Type DELETE (in capitals) to confirm." };
  }
  const user = await getCurrentUser(); // verified with getClaims()
  if (!user) return { ok: false, message: "Please log in again." };

  const admin = createAdminClient();

  // 1. Files in the student's storage folder (rows don't cascade to storage).
  const { data: files, error: listError } = await admin.storage.from(SYLLABI_BUCKET).list(user.id, { limit: 1000 });
  if (listError) return { ok: false, message: "Couldn't delete your files. Please try again." };
  if (files.length) {
    const { error } = await admin.storage.from(SYLLABI_BUCKET).remove(files.map((f) => `${user.id}/${f.name}`));
    if (error) return { ok: false, message: "Couldn't delete your files. Please try again." };
  }

  // 2. The auth user. Every table row is deleted with it ("on delete cascade").
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return { ok: false, message: "Couldn't delete your account. Please try again." };

  // 3. Clear the login cookie and say goodbye.
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/goodbye");
}
