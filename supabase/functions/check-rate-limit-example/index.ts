import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAuthedUserId, enforceRateLimit, getRateLimitConfig, getAuthedSupabaseClient } from "../_shared/rate-limit-example.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


///*** Example function for rate limiting user requests, requires some Supabase rpcs to exist  ***///
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = await getAuthedUserId(req);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { endpoint_name } = await req.json();
    
    if (!endpoint_name) {
      return new Response(
        JSON.stringify({ error: "endpoint_name is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabase = await getAuthedSupabaseClient(req);
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const config = await getRateLimitConfig(supabase, endpoint_name);
    const usage = await enforceRateLimit(req, userId, endpoint_name);

    return new Response(
      JSON.stringify({
        ...usage,
        config: config ? {
          limit: config.limit_count,
          window_type: config.window_type,
          enabled: config.enabled,
          description: config.description,
        } : null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: usage.allowed ? 200 : 429,
      }
    );
  } catch (error) {
    console.error("Error checking rate limit:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to check rate limit",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
