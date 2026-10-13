import { buildIcs, type FeedItem } from "@/lib/calendar/build-ics";
import { hasSupabaseConfig, siteUrl } from "@/lib/runtime-config";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/calendar/<token>.ics — the feed calendar apps subscribe to (PLAN.md Task 5.2).
// Calendar apps can't log in, so this uses the admin client (it bypasses RLS) and
// filters EVERY query by the one student who owns this token. Never logs the token.

const notFound = () => new Response("Not found", { status: 404 });

// If the home server is unreachable we must NOT return an empty calendar: apps would
// treat that as "every event was deleted". An error makes them keep their last copy.
const unavailable = () => new Response("Temporarily unavailable", { status: 503, headers: { "Retry-After": "900" } });

export async function GET(_request: Request, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token: rawToken } = await ctx.params;
  const token = rawToken.replace(/\.ics$/i, "");
  // Tokens are exactly 64 hex characters; anything else can't match, so skip the database.
  if (!/^[a-f0-9]{64}$/.test(token)) return notFound();

  if (!process.env.SUPABASE_SECRET_KEY || !hasSupabaseConfig()) return unavailable();
  const admin = createAdminClient();

  try {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, timezone")
      .eq("calendar_token", token)
      .maybeSingle();
    if (profileError) return unavailable();
    if (!profile) return notFound();

    const { data: items, error } = await admin
      .from("assessments")
      .select("id, title, course_id, due_date, due_time, weight_percent, date_text, include_in_calendar, courses(code)")
      .eq("user_id", profile.id) // the admin client ignores RLS, so filter explicitly
      .eq("status", "confirmed")
      .eq("include_in_calendar", true)
      .not("due_date", "is", null);
    if (error) return unavailable();

    const feedItems: FeedItem[] = (items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      course_id: item.course_id,
      course_code: item.courses?.code ?? null,
      due_date: item.due_date,
      due_time: item.due_time,
      weight_percent: item.weight_percent,
      date_text: item.date_text,
      include_in_calendar: item.include_in_calendar,
    }));

    const ics = buildIcs(feedItems, {
      timeZone: profile.timezone,
      siteUrl: siteUrl(),
    });
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="syllabus-sync.ics"',
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return unavailable();
  }
}
