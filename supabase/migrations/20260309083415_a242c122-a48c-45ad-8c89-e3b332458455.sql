ALTER TABLE public.health_conditions 
ADD COLUMN IF NOT EXISTS public_display_status boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS automated_evidence_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS source_database text DEFAULT 'manual';