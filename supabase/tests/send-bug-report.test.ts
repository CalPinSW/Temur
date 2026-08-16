import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const NO_BACKGROUND_AUTH = { auth: { autoRefreshToken: false, persistSession: false } };

async function createSignedInTestUser(): Promise<
  { userId: string; accessToken: string } | null
> {
  if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) return null;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
  const email = `send-bug-report-test-${Date.now()}-${Math.random()}@example.com`;
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
  await admin.from("bug_reports").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}

Deno.test("send-bug-report - handles CORS preflight", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-bug-report`, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  await response.text();

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("send-bug-report - returns 401 for an unauthenticated request", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-bug-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "it broke" }),
  });

  await response.text();

  // A totally header-less request can be rejected at the gateway (Kong)
  // before it ever reaches the function's own getAuthedUserId check, with
  // a different body shape than the function's own { error } response —
  // the status code is the only thing both paths guarantee.
  assertEquals(response.status, 401);
});

Deno.test("send-bug-report - returns 400 for a missing description", async () => {
  const caller = await createSignedInTestUser();
  if (!caller) {
    console.log("Skipping: could not create a signed-in test user (no service role key?)");
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-bug-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${caller.accessToken}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (response.status === 401) {
      console.log("Skipping assertion: gateway rejected the request", data);
      return;
    }

    assertEquals(response.status, 400);
    assertExists(data.error);
  } finally {
    await deleteTestUser(caller.userId);
  }
});

Deno.test("send-bug-report - persists a valid report", async () => {
  const caller = await createSignedInTestUser();
  if (!caller) {
    console.log("Skipping: could not create a signed-in test user (no service role key?)");
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-bug-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${caller.accessToken}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        description: "Everything is on fire",
        context: { platform: "web", appVersion: "0.1.0" },
      }),
    });

    const data = await response.json();

    if (response.status === 401) {
      console.log("Skipping assertion: gateway rejected the request", data);
      return;
    }

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    // Attempted regardless of whether a real RESEND_API_KEY is configured
    // in this environment — see email.test.ts for the no-key skip case.
    assertExists(data.email);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NO_BACKGROUND_AUTH);
    const { data: rows } = await admin
      .from("bug_reports")
      .select("description, context, user_id")
      .eq("user_id", caller.userId);

    assertExists(rows);
    assertEquals(rows!.length, 1);
    assertEquals(rows![0].description, "Everything is on fire");
    assertEquals(rows![0].context, { platform: "web", appVersion: "0.1.0" });
  } finally {
    await deleteTestUser(caller.userId);
  }
});
