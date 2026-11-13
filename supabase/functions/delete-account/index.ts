// Deletes the account of the user who owns the bearer token.
// The user id is taken only from the verified token, never from the request.
// user_history / user_favorites rows are removed by ON DELETE CASCADE.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.96.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authHeader)) {
    return json({ error: "Not signed in" }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    console.error("delete-account: missing Supabase environment variables");
    return json({ error: "Server is not configured" }, 500);
  }

  try {
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: userError } = await userClient.auth.getUser();
    const user = data?.user;
    if (userError || !user) {
      return json({ error: "Not signed in" }, 401);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("delete-account: deleteUser failed", deleteError);
      return json({ error: "Could not delete account" }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("delete-account: unexpected error", err);
    return json({ error: "Could not delete account" }, 500);
  }
});
