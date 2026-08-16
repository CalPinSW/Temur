import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildNotificationEmail, buildBugReportEmail, buildAuthEmail, sendEmail } from "../functions/_shared/email.ts";

const SITE_URL = "http://localhost:3000";

Deno.test("buildNotificationEmail - includes a centered logo", () => {
  const { html } = buildNotificationEmail("friend_request", "t", "b", undefined, SITE_URL);
  assertStringIncludes(html, "text-align: center");
  assertStringIncludes(html, "email-logo.png");
  assertStringIncludes(html, "<img src=");
});

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

Deno.test("buildBugReportEmail - subject prefers username over email", () => {
  const { subject } = buildBugReportEmail("it broke", undefined, "user@example.com", "someuser");
  assertEquals(subject, "Bug report from someuser");
});

Deno.test("buildBugReportEmail - subject falls back to email when there's no username", () => {
  const { subject } = buildBugReportEmail("it broke", undefined, "user@example.com", undefined);
  assertEquals(subject, "Bug report from user@example.com");
});

Deno.test("buildBugReportEmail - escapes the description and includes the reporter's email", () => {
  const { html } = buildBugReportEmail("<script>alert(1)</script>", undefined, "user@example.com", "someuser");
  assertEquals(html.includes("<script>alert(1)</script>"), false);
  assertStringIncludes(html, "&lt;script&gt;");
  assertStringIncludes(html, "user@example.com");
  assertStringIncludes(html, "@someuser");
});

Deno.test("buildBugReportEmail - renders context entries as a table", () => {
  const { html } = buildBugReportEmail(
    "it broke",
    { platform: "web", appVersion: "0.1.0" },
    "user@example.com",
    undefined,
  );
  assertStringIncludes(html, "platform");
  assertStringIncludes(html, "web");
  assertStringIncludes(html, "appVersion");
  assertStringIncludes(html, "0.1.0");
});

const AUTH_ACTION_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "reauthentication",
] as const;

Deno.test("buildAuthEmail - produces a non-empty subject and HTML for every action type", () => {
  for (const actionType of AUTH_ACTION_TYPES) {
    const { subject, html } = buildAuthEmail(actionType, "https://example.com/verify", "123456");
    assertStringIncludes(subject, "Temur");
    assertEquals(html.length > 0, true);
  }
});

Deno.test("buildAuthEmail - recovery links to the verify URL with a Reset password CTA", () => {
  const { html } = buildAuthEmail("recovery", "https://example.com/verify?token=abc", "123456");
  assertStringIncludes(html, 'href="https://example.com/verify?token=abc"');
  assertStringIncludes(html, "Reset password");
});

Deno.test("buildAuthEmail - magiclink includes the OTP token as a fallback to the link", () => {
  const { html } = buildAuthEmail("magiclink", "https://example.com/verify", "654321");
  assertStringIncludes(html, "654321");
});

Deno.test("buildAuthEmail - reauthentication shows the code but has no link CTA", () => {
  const { html } = buildAuthEmail("reauthentication", "https://example.com/verify", "999999");
  assertStringIncludes(html, "999999");
  assertEquals(html.includes('href="https://example.com/verify"'), false);
});

Deno.test("buildAuthEmail - includes a centered logo", () => {
  const { html } = buildAuthEmail("recovery", "https://example.com/verify", "123456");
  assertStringIncludes(html, "text-align: center");
  assertStringIncludes(html, "email-logo.png");
});

Deno.test("buildAuthEmail - escapes HTML in the token", () => {
  const { html } = buildAuthEmail("magiclink", "https://example.com/verify", "<script>alert(1)</script>");
  assertEquals(html.includes("<script>alert(1)</script>"), false);
  assertStringIncludes(html, "&lt;script&gt;");
});

Deno.test("buildBugReportEmail - centers the page but keeps the context table left-aligned", () => {
  const { html } = buildBugReportEmail(
    "it broke",
    { platform: "web" },
    "user@example.com",
    undefined,
  );
  assertStringIncludes(html, "text-align: center");
  assertStringIncludes(html, "<table style=\"text-align: left;");
});

Deno.test("buildBugReportEmail - omits the context table entirely when there's no context", () => {
  const { html } = buildBugReportEmail("it broke", undefined, "user@example.com", undefined);
  assertEquals(html.includes("<table"), false);
});
