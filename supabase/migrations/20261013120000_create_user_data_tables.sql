-- Per-user search history and favorites for signed-in (Google) users.
-- Applies to the app's single Supabase project (vxtqizfrajbzcbktxrge).
-- Extra columns (mondo_id, total_publications, grade_counts, top_foods) let the
-- client round-trip its StoredEntry cache without loss.

CREATE TABLE IF NOT EXISTS public.user_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  disease_id text NOT NULL,
  disease_name text NOT NULL,
  mondo_id text,
  foods_found integer DEFAULT 0,
  total_publications integer DEFAULT 0,
  grade_counts jsonb DEFAULT '{"A":0,"B":0,"C":0}'::jsonb,
  top_foods text[] DEFAULT '{}',
  searched_at timestamptz DEFAULT now(),
  CONSTRAINT user_history_user_disease_key UNIQUE (user_id, disease_id)
);

CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  disease_id text NOT NULL,
  disease_name text NOT NULL,
  mondo_id text,
  foods_found integer DEFAULT 0,
  total_publications integer DEFAULT 0,
  grade_counts jsonb DEFAULT '{"A":0,"B":0,"C":0}'::jsonb,
  top_foods text[] DEFAULT '{}',
  saved_at timestamptz DEFAULT now(),
  CONSTRAINT user_favorites_user_disease_key UNIQUE (user_id, disease_id)
);

CREATE INDEX IF NOT EXISTS user_history_user_searched_at_idx
  ON public.user_history (user_id, searched_at DESC);

CREATE INDEX IF NOT EXISTS user_favorites_user_saved_at_idx
  ON public.user_favorites (user_id, saved_at DESC);

ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see their own history" ON public.user_history;
CREATE POLICY "Users can only see their own history" ON public.user_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only see their own favorites" ON public.user_favorites;
CREATE POLICY "Users can only see their own favorites" ON public.user_favorites
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
