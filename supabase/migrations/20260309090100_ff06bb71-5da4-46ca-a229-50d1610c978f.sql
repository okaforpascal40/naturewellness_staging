
CREATE TABLE public.genes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gene_symbol text NOT NULL UNIQUE,
  gene_name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.genes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read genes" ON public.genes FOR SELECT USING (true);

CREATE TABLE public.pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pathways" ON public.pathways FOR SELECT USING (true);

CREATE TABLE public.gene_disease_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gene_id uuid NOT NULL REFERENCES public.genes(id) ON DELETE CASCADE,
  condition_id uuid NOT NULL REFERENCES public.health_conditions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gene_id, condition_id)
);

ALTER TABLE public.gene_disease_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gene_disease_associations" ON public.gene_disease_associations FOR SELECT USING (true);

CREATE TABLE public.gene_pathway_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gene_id uuid NOT NULL REFERENCES public.genes(id) ON DELETE CASCADE,
  pathway_id uuid NOT NULL REFERENCES public.pathways(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gene_id, pathway_id)
);

ALTER TABLE public.gene_pathway_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gene_pathway_associations" ON public.gene_pathway_associations FOR SELECT USING (true);
