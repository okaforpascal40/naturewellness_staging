/**
 * The app's single Supabase client (project vxtqizfrajbzcbktxrge): reference
 * data (Admin, food details, pathways), Google sign-in, and per-user
 * history/favorites sync all go through it.
 *
 * Configuration comes from VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
 * When either is missing (or the client cannot be constructed) `supabase` is
 * null and `authEnabled` is false instead of crashing the whole app at import
 * time; data reads then fail through `requireSupabase()` into each page's
 * existing error handling.
 */
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

function createAppClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) {
    console.warn("supabase: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set; Supabase disabled");
    return null;
  }
  try {
    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // PKCE keeps tokens out of the redirect URL (`?code=` instead of an
        // `#access_token` fragment); recommended for browser apps.
        flowType: "pkce",
      },
    });
  } catch (err) {
    console.error("supabase: could not create client; Supabase disabled", err);
    return null;
  }
}

export const supabase: SupabaseClient | null = createAppClient();
export const authEnabled: boolean = supabase !== null;

/** The client for data reads/writes; throws (into the caller's error path) when unconfigured. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

/** Start the Google OAuth redirect. Throws so the caller can surface a toast. */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error("Sign-in is not configured");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

/** Sign out. Errors are logged, never thrown into the UI. */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("auth: sign-out failed", error);
  } catch (err) {
    console.error("auth: sign-out failed", err);
  }
}

/** Current user, kept live via the initial session + auth state changes. */
export function useUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(authEnabled);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.warn("auth: could not read session", error);
        setUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.warn("auth: could not read session", err);
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

/* ------------------------------------------------------------------ */
/* Google profile helpers                                              */
/* ------------------------------------------------------------------ */

const metaString = (user: User, key: string): string | null => {
  const value: unknown = user.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export const displayNameOf = (user: User): string =>
  metaString(user, "full_name") ?? metaString(user, "name") ?? user.email ?? "";

const capitalize = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

/**
 * Name for a greeting: the LAST word of the Google name, since Google returns
 * Nigerian names surname-first ("OGBONNA PASCAL OKAFOR" → "Okafor"); else the
 * email's local part. Either way, capitalised with the rest lower-cased.
 */
export const firstNameOf = (user: User): string | null => {
  const fullName = metaString(user, "full_name") ?? metaString(user, "name");
  const word = fullName?.split(/\s+/).pop() || user.email?.split("@")[0]?.trim();
  return word ? capitalize(word) : null;
};

export const avatarUrlOf = (user: User): string | null =>
  metaString(user, "avatar_url") ?? metaString(user, "picture");

export const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
