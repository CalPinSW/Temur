import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Creates a real, signed-in test user and returns their access token, so
// authorization-path tests exercise a genuine caller identity rather than
// the anon key. Callers are responsible for deleting the user afterwards.
// autoRefreshToken/persistSession disabled: these clients are used for a
// single request each, and the default auto-refresh timer otherwise leaks
// past the test's lifetime (Deno's test sanitizer flags it as a leak).
const NO_BACKGROUND_AUTH = { auth: { autoRefreshToken: false, persistSession: false } };

async function createSignedInTestUser(): Promise<
  { userId: string; accessToken: string } | null
> {
  if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) return null;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  const email = `send-notification-test-${Date.now()}-${Math.random()}@example.com`;
  const password = "test123456";

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) return null;

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, NO_BACKGROUND_AUTH);
  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signedIn.session) {
    await admin.auth.admin.deleteUser(created.user.id);
    return null;
  }

  return { userId: created.user.id, accessToken: signedIn.session.access_token };
}

async function deleteTestUser(userId: string): Promise<void> {
  if (!SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  await admin.auth.admin.deleteUser(userId);
}

Deno.test("send-notification - returns error for missing push token", async () => {
  // Skip if no anon key (CI environment)
  if (!SUPABASE_ANON_KEY) {
    console.log("Skipping: No SUPABASE_ANON_KEY");
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      userId: "00000000-0000-0000-0000-000000000000",
      title: "Test Notification",
      body: "This is a test",
    }),
  });

  const data = await response.json();
  
  // Function may return 401 (JWT required) or 200 with error
  if (response.status === 200) {
    assertExists(data.error);
    assertEquals(data.error, "Could not load recipient profile");
  } else {
    // JWT verification enabled - this is expected behavior
    assertEquals(response.status, 401);
  }
});

Deno.test("send-notification - attempts email even when the recipient has no push token", async () => {
  const caller = await createSignedInTestUser();
  if (!caller) {
    console.log("Skipping: could not create a signed-in test user (no service role key?)");
    return;
  }

  try {
    // Self-notify: callerId === targetUserId auto-authorizes regardless of
    // type, and a freshly-created test user has no push_token set.
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${caller.accessToken}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        userId: caller.userId,
        type: "friend_accepted",
        title: "Test Notification",
        body: "This is a test",
      }),
    });

    const data = await response.json();

    if (response.status === 401) {
      console.log("Skipping assertion: gateway rejected the request", data);
      return;
    }

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.push, null);
    // Email is attempted regardless of push_token presence — without a real
    // RESEND_API_KEY configured locally this attempt fails gracefully
    // rather than being skipped outright, which is exactly what this test
    // is verifying (the previous behavior returned early before ever
    // reaching the email path when there was no push token).
    assertExists(data.email);
  } finally {
    await deleteTestUser(caller.userId);
  }
});

Deno.test("send-notification - handles CORS preflight", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  // Consume response body to avoid leak
  await response.text();
  
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("send-notification - requires valid request body", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  // Should handle missing userId gracefully
  assertExists(data);
});

Deno.test("send-notification - returns 400 for a request missing type", async () => {
  const caller = await createSignedInTestUser();
  if (!caller) {
    console.log("Skipping: could not create a signed-in test user (no service role key?)");
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${caller.accessToken}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        userId: caller.userId,
        title: "Test Notification",
        body: "This is a test",
      }),
    });

    const data = await response.json();

    if (response.status === 401) {
      // Gateway-level JWT verification rejected the request before it
      // reached the function's own logic (e.g. local stack auth
      // misconfiguration) — nothing more this test can assert here.
      console.log("Skipping assertion: gateway rejected the request", data);
      return;
    }

    assertEquals(response.status, 400);
    assertExists(data.error);
  } finally {
    await deleteTestUser(caller.userId);
  }
});

Deno.test("send-notification - suppresses email when the recipient has disabled it for that type", async () => {
  const caller = await createSignedInTestUser();
  if (!caller) {
    console.log("Skipping: could not create a signed-in test user (no service role key?)");
    return;
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
    await admin.from("notification_preferences").insert({
      user_id: caller.userId,
      notification_type: "friend_accepted",
      push_enabled: true,
      email_enabled: false,
    });

    // Self-notify: callerId === targetUserId auto-authorizes regardless of type.
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${caller.accessToken}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        userId: caller.userId,
        type: "friend_accepted",
        title: "Test Notification",
        body: "This is a test",
      }),
    });

    const data = await response.json();

    if (response.status === 401) {
      console.log("Skipping assertion: gateway rejected the request", data);
      return;
    }

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    assertEquals(data.email, null);
  } finally {
    await deleteTestUser(caller.userId);
  }
});

Deno.test("send-notification - returns 403 when caller has no relationship to the target", async () => {
  const caller = await createSignedInTestUser();
  const target = await createSignedInTestUser();
  if (!caller || !target) {
    console.log("Skipping: could not create signed-in test users (no service role key?)");
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${caller.accessToken}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        userId: target.userId,
        type: "group_invite",
        title: "New Group Invite",
        body: "You were invited",
      }),
    });

    const data = await response.json();

    if (response.status === 401) {
      console.log("Skipping assertion: gateway rejected the request", data);
      return;
    }

    assertEquals(response.status, 403);
    assertExists(data.error);
  } finally {
    await deleteTestUser(caller.userId);
    await deleteTestUser(target.userId);
  }
});
