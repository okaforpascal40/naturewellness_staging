import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vxtqizfrajbzcbktxrge.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dHFpemZyYWpiemNia3R4cmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTE2MDcsImV4cCI6MjA4NTc2NzYwN30.WC4JPJjcPC0f8djjra33724HRnMDsz5xW2wiJlJl3mI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
