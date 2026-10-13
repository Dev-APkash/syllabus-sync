// npm run check:rls — proves Row Level Security keeps each student's data private (PLAN.md Task 2.6).
// Setup: create two accounts on your site, upload one PDF as user A, and put
// TEST_USER_A_EMAIL / _PASSWORD and TEST_USER_B_EMAIL / _PASSWORD in your env file.
// Uses ONLY the publishable key, so it tests exactly what a real user could do.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { requireEnv } from "./load-env";

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

type Client = SupabaseClient<Database>;
let failures = 0;

function report(ok: boolean, label: string) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
}

async function signIn(prefix: "A" | "B"): Promise<{ client: Client; userId: string }> {
  const client = createClient<Database>(url, publishableKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: requireEnv(`TEST_USER_${prefix}_EMAIL`),
    password: requireEnv(`TEST_USER_${prefix}_PASSWORD`),
  });
  if (error || !data.user) {
    console.error(`Couldn't sign in as test user ${prefix}: ${error?.message}`);
    process.exit(1);
  }
  return { client, userId: data.user.id };
}

async function main() {
  const a = await signIn("A");
  const b = await signIn("B");

  // What user A owns
  const { data: aCourses } = await a.client.from("courses").select("id");
  const { data: aSyllabi } = await a.client.from("syllabi").select("id, file_path");
  const courseIds = (aCourses ?? []).map((c) => c.id);
  const syllabusIds = (aSyllabi ?? []).map((s) => s.id);
  const filePath = aSyllabi?.[0]?.file_path;
  if (!courseIds.length || !filePath) {
    console.error("User A has no uploads. Log in as user A and upload one PDF first.");
    process.exit(1);
  }
  console.log(`User A owns ${courseIds.length} course(s) and ${syllabusIds.length} syllabus/syllabi.\n`);

  // Everything below runs as user B (or as nobody) and must find NOTHING of A's.
  const bCourses = await b.client.from("courses").select("id").in("id", courseIds);
  report(bCourses.data?.length === 0, "B cannot read A's courses");

  const bSyllabi = await b.client.from("syllabi").select("id").in("id", syllabusIds);
  report(bSyllabi.data?.length === 0, "B cannot read A's syllabi");

  const bAssessments = await b.client.from("assessments").select("id").eq("user_id", a.userId);
  report(bAssessments.data?.length === 0, "B cannot read A's assessments");

  const bRuns = await b.client.from("extraction_runs").select("id").eq("user_id", a.userId);
  report(bRuns.data?.length === 0, "B cannot read A's extraction runs");

  const bProfile = await b.client.from("profiles").select("calendar_token").eq("id", a.userId);
  report(bProfile.data?.length === 0, "B cannot read A's profile (calendar token)");

  const bDownload = await b.client.storage.from("syllabi").download(filePath);
  report(!!bDownload.error, "B cannot download A's PDF");

  const bUpdate = await b.client.from("courses").update({ name: "hacked" }).eq("id", courseIds[0]).select("id");
  report((bUpdate.data?.length ?? 0) === 0, "B cannot update A's course");

  const bDelete = await b.client.from("courses").delete().eq("id", courseIds[0]).select("id");
  report((bDelete.data?.length ?? 0) === 0, "B cannot delete A's course");

  const bInsertAsA = await b.client.from("courses").insert({ user_id: a.userId, name: "fake" });
  report(!!bInsertAsA.error, "B cannot create a course owned by A");

  const bAssessmentOnA = await b.client.from("assessments").insert({ course_id: courseIds[0], title: "fake" });
  report(!!bAssessmentOnA.error, "B cannot add an assessment to A's course");

  const bUploadToA = await b.client.storage
    .from("syllabi")
    .upload(`${a.userId}/intruder.pdf`, new Blob(["%PDF-1.4"], { type: "application/pdf" }));
  report(!!bUploadToA.error, "B cannot upload into A's folder");

  const bRemoveA = await b.client.storage.from("syllabi").remove([filePath]);
  report((bRemoveA.data?.length ?? 0) === 0, "B cannot delete A's PDF");

  const anon = createClient<Database>(url, publishableKey, { auth: { persistSession: false } });
  const anonCourses = await anon.from("courses").select("id");
  report((anonCourses.data?.length ?? 0) === 0, "Logged-out visitors cannot read any courses");

  const anonProfiles = await anon.from("profiles").select("id");
  report((anonProfiles.data?.length ?? 0) === 0, "Logged-out visitors cannot read any profiles");

  console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error("check-rls crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
