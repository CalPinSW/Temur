import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildNotificationEmail, sendEmail } from "../functions/_shared/email.ts";

const SITE_URL = "http://localhost:3000";

Deno.test("buildNotificationEmail - subject matches the given title", () => {
  const { subject } = buildNotificationEmail(
    "friend_request",
    "New Friend Request",
    "Alex sent you a friend request",
    undefined,
    SITE_URL,
  );
  assertEquals(subject, "New Friend Request");
});

Deno.test("buildNotificationEmail - escapes HTML in title and body", () => {
  const { html } = buildNotificationEmail(
    "friend_request",
    "<script>alert(1)</script>",
    "body & <b>bold</b>",
    undefined,
    SITE_URL,
  );
  assertEquals(html.includes("<script>alert(1)</script>"), false);
  assertStringIncludes(html, "&lt;script&gt;");
  assertStringIncludes(html, "&amp;");
});

Deno.test("buildNotificationEmail - links friend_request to /friends/requests", () => {
  const { html } = buildNotificationEmail("friend_request", "t", "b", undefined, SITE_URL);
  assertStringIncludes(html, `${SITE_URL}/friends/requests`);
});

Deno.test("buildNotificationEmail - links group_invite to /groups/invites", () => {
  const { html } = buildNotificationEmail("group_invite", "t", "b", undefined, SITE_URL);
  assertStringIncludes(html, `${SITE_URL}/groups/invites`);
});

Deno.test("buildNotificationEmail - links game-scoped types to /games/{gameId} when present", () => {
  for (const type of ["game_invite", "team_assigned", "ringers_open", "game_visible"] as const) {
    const { html } = buildNotificationEmail(type, "t", "b", { gameId: "abc-123" }, SITE_URL);
    assertStringIncludes(html, `${SITE_URL}/games/abc-123`);
  }
});

Deno.test("buildNotificationEmail - falls back to /games when a game-scoped type has no gameId", () => {
  const { html } = buildNotificationEmail("game_invite", "t", "b", undefined, SITE_URL);
  assertStringIncludes(html, `${SITE_URL}/games"`);
});

Deno.test("sendEmail - skips gracefully when RESEND_API_KEY is not configured", async () => {
  const result = await sendEmail("someone@example.com", "subject", "<p>body</p>");
  assertEquals(result.attempted, false);
  assertEquals(result.ok, false);
  assertEquals(result.error, "RESEND_API_KEY not configured");
});
