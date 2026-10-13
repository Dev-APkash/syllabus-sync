import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { CalendarFeedCard } from "@/components/settings/calendar-feed-card";
import { CanvasCard } from "@/components/settings/canvas-card";
import { DeleteAccountCard } from "@/components/settings/delete-account-card";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireUser } from "@/lib/auth";
import { canvasAvailable } from "@/lib/canvas/api";
import { formatDateOnly } from "@/lib/dates";
import { siteUrl } from "@/lib/runtime-config";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <Suspense fallback={<PageSkeleton withHeader={false} rows={3} />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile, error }, { data: canvas }] = await Promise.all([
    supabase.from("profiles").select("calendar_token, timezone").eq("id", user.id).maybeSingle(),
    // Never select token_encrypted here: the page only needs to know whether Canvas is linked.
    supabase
      .from("canvas_connections")
      .select("base_url, canvas_user_name, created_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (error) throw new Error(error.message);

  const site = siteUrl();
  return (
    <div className="flex flex-col">
      <SettingsSection
        title="Calendar feed"
        description={
          <>
            Subscribe to this link once. Confirmed deadlines appear in your calendar, and edits follow. Google Calendar
            can take up to a day to show changes. Anyone with the link can see your deadlines.
          </>
        }
      >
        {profile ? (
          <CalendarFeedCard feedUrl={`${site}/api/calendar/${profile.calendar_token}.ics`} />
        ) : (
          <p className="text-sm text-muted-foreground">Your profile is still being set up. Refresh in a moment.</p>
        )}
      </SettingsSection>

      {canvasAvailable() && (
        <SettingsSection
          title="Canvas"
          description="Link your Canvas account to see your current grade, what's due soon and what's been graded on each course page."
        >
          <CanvasCard
            linked={
              canvas
                ? {
                    host: new URL(canvas.base_url).host,
                    userName: canvas.canvas_user_name,
                    since: formatDateOnly(canvas.created_at.slice(0, 10)),
                  }
                : null
            }
          />
        </SettingsSection>
      )}

      <SettingsSection title="Account" description="Your time zone is set from your browser, so times land correctly.">
        <dl className="grid gap-3 text-sm sm:grid-cols-[9rem_1fr]">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-muted-foreground">Time zone</dt>
          <dd>{profile?.timezone ?? "UTC"}</dd>
        </dl>
      </SettingsSection>

      <SettingsSection
        title="Delete account"
        description="Permanently deletes your account, every uploaded PDF, your deadlines and your marks. Your calendar feed stops working. This can't be undone."
      >
        <DeleteAccountCard />
      </SettingsSection>
    </div>
  );
}
