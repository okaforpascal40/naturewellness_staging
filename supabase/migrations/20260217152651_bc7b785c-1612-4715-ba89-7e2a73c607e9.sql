
-- Create health_conditions table
CREATE TABLE public.health_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create foods table
CREATE TABLE public.foods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  scientific_name TEXT,
  emoji TEXT DEFAULT '🍎',
  category TEXT DEFAULT 'General',
  nutrients JSONB DEFAULT '{}',
  compounds JSONB DEFAULT '[]',
  warnings TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create food_condition_links table
CREATE TABLE public.food_condition_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES public.health_conditions(id) ON DELETE CASCADE,
  evidence_level TEXT NOT NULL DEFAULT 'emerging' CHECK (evidence_level IN ('strong', 'moderate', 'emerging')),
  layer TEXT NOT NULL DEFAULT 'health-safe' CHECK (layer IN ('health-safe', 'academic')),
  approved_for_public BOOLEAN NOT NULL DEFAULT false,
  mechanism TEXT,
  key_compounds TEXT[] DEFAULT '{}',
  pubmed_refs TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.health_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_condition_links ENABLE ROW LEVEL SECURITY;

-- Public read access for health_conditions (public data)
CREATE POLICY "Anyone can read health conditions"
  ON public.health_conditions FOR SELECT
  USING (true);

-- Public read access for foods (public data)
CREATE POLICY "Anyone can read foods"
  ON public.foods FOR SELECT
  USING (true);

-- Public read access for approved food_condition_links
CREATE POLICY "Anyone can read approved food condition links"
  ON public.food_condition_links FOR SELECT
  USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_health_conditions_updated_at
  BEFORE UPDATE ON public.health_conditions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_foods_updated_at
  BEFORE UPDATE ON public.foods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_condition_links_updated_at
  BEFORE UPDATE ON public.food_condition_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
