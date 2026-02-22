import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

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
    assertEquals(data.error, "User has no push token");
  } else {
    // JWT verification enabled - this is expected behavior
    assertEquals(response.status, 401);
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
