import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowDown, Dna, Route } from "lucide-react";

interface MechanisticPathwaysProps {
  foodName: string;
  compounds: string[];
  conditionIds: string[];
  conditionNames: Record<string, string>;
}

interface GeneRow {
  id: string;
  gene_symbol: string;
  gene_name: string;
  description: string | null;
}

interface PathwayRow {
  id: string;
  pathway_name: string;
  description: string | null;
}

const MechanisticPathways = ({
  foodName,
  compounds,
  conditionIds,
  conditionNames,
}: MechanisticPathwaysProps) => {
  const { data: pathwayData, isLoading } = useQuery({
    queryKey: ["mechanistic-pathways", conditionIds],
    queryFn: async () => {
      if (conditionIds.length === 0) return [];

      // Get gene-disease associations for these conditions
      const { data: geneLinks, error: glError } = await supabase
        .from("gene_disease_associations")
        .select("gene_id, condition_id")
        .in("condition_id", conditionIds);
      if (glError) throw glError;
      if (!geneLinks || geneLinks.length === 0) return [];

      const geneIds = [...new Set(geneLinks.map((gl) => gl.gene_id))];

      // Fetch genes and gene-pathway associations in parallel
      const [genesRes, gpaRes] = await Promise.all([
        supabase.from("genes").select("*").in("id", geneIds),
        supabase
          .from("gene_pathway_associations")
          .select("gene_id, pathway_id")
          .in("gene_id", geneIds),
      ]);
      if (genesRes.error) throw genesRes.error;
      if (gpaRes.error) throw gpaRes.error;

      const genes: GeneRow[] = genesRes.data ?? [];
      const gpaLinks = gpaRes.data ?? [];

      const pathwayIds = [...new Set(gpaLinks.map((g) => g.pathway_id))];
      let pathways: PathwayRow[] = [];
      if (pathwayIds.length > 0) {
        const { data, error } = await supabase
          .from("pathways")
          .select("*")
          .in("id", pathwayIds);
        if (error) throw error;
        pathways = data ?? [];
      }

      // Build per-condition chains
      return conditionIds.map((condId) => {
        const condGeneIds = geneLinks
          .filter((gl) => gl.condition_id === condId)
          .map((gl) => gl.gene_id);
        const condGenes = genes.filter((g) => condGeneIds.includes(g.id));
        const condPathwayIds = gpaLinks
          .filter((gp) => condGeneIds.includes(gp.gene_id))
          .map((gp) => gp.pathway_id);
        const condPathways = pathways.filter((p) =>
          condPathwayIds.includes(p.id)
        );
        return {
          conditionId: condId,
          conditionName: conditionNames[condId] ?? "Unknown",
          genes: condGenes,
          pathways: condPathways,
        };
      });
    },
    enabled: isAcademic && conditionIds.length > 0,
  });

  if (!isAcademic) return null;

  if (isLoading) {
    return (
      <div className="pt-2">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Dna className="h-4 w-4" /> Mechanistic Pathways
        </h3>
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading pathway data…
        </p>
      </div>
    );
  }

  const hasData = pathwayData && pathwayData.some((d) => d.genes.length > 0);

  return (
    <div className="pt-2">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Dna className="h-4 w-4 text-primary" /> Mechanistic Pathways
      </h3>

      {!hasData ? (
        <p className="text-sm text-muted-foreground italic">
          Gene and pathway data pending curation
        </p>
      ) : (
        <div className="space-y-6">
          {pathwayData!
            .filter((d) => d.genes.length > 0)
            .map((chain) => (
              <div
                key={chain.conditionId}
                className="space-y-3 rounded-lg border border-border/60 p-4 bg-card"
              >
                {/* Food + Compounds */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{foodName}</span>
                  {compounds.length > 0 && (
                    <>
                      <span className="text-muted-foreground text-xs">
                        contains
                      </span>
                      {compounds.slice(0, 5).map((c) => (
                        <Badge
                          key={c}
                          variant="outline"
                          className="border-primary/30 text-primary text-xs"
                        >
                          {c}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>

                <div className="flex justify-center">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Genes */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">
                    Target Genes
                  </p>
                  <TooltipProvider>
                    <div className="flex flex-wrap gap-2">
                      {chain.genes.map((gene) => (
                        <Tooltip key={gene.id}>
                          <TooltipTrigger asChild>
                            <div>
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 cursor-help text-sm px-3 py-1">
                                <Dna className="h-3 w-3 mr-1.5" />
                                {gene.gene_symbol}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold">{gene.gene_name}</p>
                            {gene.description && (
                              <p className="text-xs mt-1">
                                {gene.description}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>

                {chain.pathways.length > 0 && (
                  <>
                    <div className="flex justify-center">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Pathways */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">
                        Modulated Pathways
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {chain.pathways.map((pw) => (
                          <Card
                            key={pw.id}
                            className="bg-sky-50/60 dark:bg-sky-950/20 border-sky-200/50 dark:border-sky-800/30"
                          >
                            <CardContent className="p-3">
                              <p className="text-sm font-medium flex items-center gap-1.5">
                                <Route className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                                {pw.pathway_name}
                              </p>
                              {pw.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {pw.description}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-center">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Condition */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">
                    Relevant to
                  </p>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {chain.conditionName}
                  </Badge>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default MechanisticPathways;
