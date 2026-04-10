import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Dna, Route, FlaskConical, AlertTriangle } from "lucide-react";
import { DISEASE_MAP, runAutomation, type EvidenceScore } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";

const evidenceBadge: Record<string, { label: string; className: string }> = {
  high: { label: "✓✓✓ Strong Evidence", className: "bg-green-100 text-green-800 border-green-200" },
  medium: { label: "✓✓ Moderate Evidence", className: "bg-amber-100 text-amber-800 border-amber-200" },
  low: { label: "✓ Emerging Evidence", className: "bg-blue-100 text-blue-800 border-blue-200" },
};

function groupByFood(scores: EvidenceScore[]) {
  const map = new Map<string, { food_name: string; best_score: number; evidence_level: string; entries: EvidenceScore[] }>();
  for (const s of scores) {
    const existing = map.get(s.food_name);
    if (existing) {
      existing.entries.push(s);
      if (s.score > existing.best_score) {
        existing.best_score = s.score;
        existing.evidence_level = s.evidence_level;
      }
    } else {
      map.set(s.food_name, { food_name: s.food_name, best_score: s.score, evidence_level: s.evidence_level, entries: [s] });
    }
  }
  return [...map.values()].sort((a, b) => b.best_score - a.best_score);
}

const Recommendations = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const disease = DISEASE_MAP.find((d) => d.id === id);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["automation-run", disease?.mondoId],
    queryFn: () => runAutomation(disease!.mondoId),
    enabled: !!disease,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const foods = data ? groupByFood(data.evidence_scores) : [];

  return (
    <div className="container mx-auto px-4 py-10">
      <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate("/conditions")}>
        <ArrowLeft className="h-4 w-4" /> Back to Conditions
      </Button>

      {!disease && (
        <div className="text-center py-20 text-muted-foreground">
          <p>Condition not found.</p>
        </div>
      )}

      {disease && (
        <>
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-2" style={{ fontFamily: "'Merriweather', serif" }}>
              {disease.name}
            </h1>
            <p className="text-muted-foreground mb-4">AI-powered food recommendations based on gene-pathway analysis</p>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="max-w-lg mx-auto text-center py-16 space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-semibold text-secondary">Discovering genes and food recommendations…</p>
                <p className="text-sm text-muted-foreground">This may take up to 60 seconds</p>
              </div>
              <Progress value={undefined} className="h-2 w-full [&>div]:animate-[indeterminate_1.5s_ease-in-out_infinite]" />
              <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Dna className="h-3 w-3" /> Analyzing genes</span>
                <span className="flex items-center gap-1"><Route className="h-3 w-3" /> Mapping pathways</span>
                <span className="flex items-center gap-1"><FlaskConical className="h-3 w-3" /> Scoring compounds</span>
              </div>
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="max-w-lg mx-auto text-center py-16 space-y-4">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-lg font-semibold text-secondary">Something went wrong</p>
              <p className="text-sm text-muted-foreground">{(error as Error)?.message || "An unexpected error occurred."}</p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          )}

          {/* Results */}
          {data && !isLoading && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Genes Found", value: data.genes_found },
                  { label: "Pathways", value: data.pathways_found },
                  { label: "Compounds", value: data.compounds_found },
                  { label: "Foods", value: data.foods_found },
                ].map((s) => (
                  <Card key={s.label} className="border-primary/10">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {foods.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <p>No food recommendations found for this condition yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                  {foods.map((food) => {
                    const ev = evidenceBadge[food.evidence_level] || evidenceBadge.low;
                    return (
                      <Card key={food.food_name} className="border-primary/10 hover:shadow-lg transition-shadow h-full">
                        <CardContent className="p-6 flex flex-col h-full">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">🍎</span>
                            <h3 className="font-bold text-secondary">{food.food_name}</h3>
                          </div>

                          <Badge variant="outline" className={`w-fit mb-3 text-xs ${ev.className}`}>
                            {ev.label}
                          </Badge>

                          <p className="text-sm font-semibold text-primary mb-1">
                            Score: {food.best_score.toFixed(1)}
                          </p>

                          {/* Compounds, genes, pathways */}
                          <div className="space-y-2 mb-4 flex-1">
                            {food.entries.slice(0, 3).map((entry, i) => (
                              <div key={i} className="text-xs text-muted-foreground bg-muted/50 rounded p-2 space-y-0.5">
                                <p><span className="font-medium text-foreground">Compound:</span> {entry.compound_name}</p>
                                <p><span className="font-medium text-foreground">Gene:</span> {entry.gene_symbol}</p>
                                <p><span className="font-medium text-foreground">Pathway:</span> {entry.pathway_name}</p>
                              </div>
                            ))}
                            {food.entries.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{food.entries.length - 3} more pathways</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <MedicalDisclaimer />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Recommendations;
