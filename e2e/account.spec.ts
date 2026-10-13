import { expect, test } from "@playwright/test";

// The whole account journey through the real pages, as a student would do it. It proves the
// browser finds Supabase from the runtime settings (one image, any address), that server
// actions pass the origin check behind the proxy, and that the account can be deleted again.
test("sign up, sign out, log in, use settings, delete the account", async ({ page, baseURL }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = `E2e-${Math.random().toString(36).slice(2)}-pass`;
  page.on("dialog", (dialog) => dialog.accept()); // the "Reset your calendar link?" question

  // Sign up: email confirmation is off on test installs, so it goes straight to the course list.
  await page.goto("/auth/sign-up");
  await expect(page.locator("#runtime-config")).toHaveCount(1);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Repeat password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "No courses yet" })).toBeVisible();

  // Sign out, then log back in.
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Settings: the feed link uses this install's address (read at runtime), and resetting it
  // is a server action, so this also checks the origin check behind the proxy.
  await page.goto("/settings");
  const feed = page.getByLabel("Calendar feed link");
  await expect(feed).toHaveValue(new RegExp(`^${baseURL}/api/calendar/[a-f0-9]{64}\\.ics$`));
  const before = await feed.inputValue();
  await page.getByRole("button", { name: "Reset link" }).click();
  await expect(page.getByText("New link created.")).toBeVisible();
  await expect(feed).not.toHaveValue(before);

  // Delete the account through the real page (another server action), which ends on /goodbye.
  await page.locator("#delete-confirmation").fill("DELETE");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/goodbye$/);
});
