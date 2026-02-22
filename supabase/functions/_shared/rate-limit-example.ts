import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number | null;
  endpoint: string;
  error?: string;
}

export async function getAuthedSupabaseClient(req: Request): Promise<SupabaseClient | null> {
  const authHeader = req.headers.get("Authorization");
  const apiKey = req.headers.get("apikey");
  
  if (!authHeader && !apiKey) {
    return null;
  }
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader || `Bearer ${apiKey}` },
    },
  });

  return supabase;
}

export async function getAuthedUserId(req: Request): Promise<string | null> {
  const supabase = await getAuthedSupabaseClient(req);
  if (!supabase) return null;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

export async function enforceRateLimit(
  req: Request,
  userId: string,
  endpointName: string
): Promise<RateLimitResult> {
  const supabase = await getAuthedSupabaseClient(req);
  if (!supabase) {
    return {
      allowed: false,
      count: 0,
      limit: null,
      endpoint: endpointName,
      error: "Unauthorized",
    };
  }

  const { data: windowKey, error: windowError } = await supabase.rpc(
    "get_rate_limit_window_key",
    { p_endpoint_name: endpointName }
  );

  if (windowError || !windowKey) {
    return {
      allowed: true,
      count: 0,
      limit: null,
      endpoint: endpointName,
    };
  }

  const { data, error } = await supabase.rpc("check_and_increment_rate_limit", {
    p_user_id: userId,
    p_endpoint_name: endpointName,
    p_window_key: windowKey,
  });

  if (error) {
    throw error;
  }

  return data as RateLimitResult;
}

export async function getRateLimitConfig(
  supabase: SupabaseClient,
  endpointName: string
) {
  const { data, error } = await supabase
    .from("rate_limit_config")
    .select("*")
    .eq("endpoint_name", endpointName)
    .single();

  if (error) {
    return null;
  }

  return data;
}
