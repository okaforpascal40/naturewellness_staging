import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vxtqizfrajbzcbktxrge.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_eB-saruD7Q-Bz6h08dx0og_R9kHnWqU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
