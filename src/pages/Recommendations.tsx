import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Dna,
  Route,
  FlaskConical,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { DISEASE_MAP, runAutomation, type EvidenceScore, type Citation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";

// Map evidence_grade (A/B/C) and fall back from evidence_level when missing
const gradeStyles: Record<string, { label: string; className: string }> = {
  A: {
    label: "Grade A · Strong Evidence",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  B: {
    label: "Grade B · Moderate Evidence",
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  C: {
    label: "Grade C · Emerging Evidence",
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
};

function deriveGrade(entry: EvidenceScore): "A" | "B" | "C" {
  if (entry.evidence_grade && ["A", "B", "C"].includes(entry.evidence_grade.toUpperCase())) {
    return entry.evidence_grade.toUpperCase() as "A" | "B" | "C";
  }
  switch ((entry.evidence_level || "").toLowerCase()) {
    case "high":
      return "A";
    case "medium":
      return "B";
    default:
      return "C";
  }
}

interface FoodGroup {
  food_name: string;
  best_score: number;
  grade: "A" | "B" | "C";
  publication_count: number;
  citations: Citation[];
  entries: EvidenceScore[];
}

function groupByFood(scores: EvidenceScore[]): FoodGroup[] {
  const map = new Map<string, FoodGroup>();
  const gradeRank = { A: 3, B: 2, C: 1 } as const;

  for (const s of scores) {
    const grade = deriveGrade(s);
    const pubCount = s.publication_count ?? 0;
    const cites = s.citations ?? [];
    const existing = map.get(s.food_name);
    if (existing) {
      existing.entries.push(s);
      existing.publication_count += pubCount;
      existing.citations.push(...cites);
      if (s.score > existing.best_score) existing.best_score = s.score;
      if (gradeRank[grade] > gradeRank[existing.grade]) existing.grade = grade;
    } else {
      map.set(s.food_name, {
        food_name: s.food_name,
        best_score: s.score,
        grade,
        publication_count: pubCount,
        citations: [...cites],
        entries: [s],
      });
    }
  }

  // Dedupe citations by PMID/title
  for (const g of map.values()) {
    const seen = new Set<string>();
    g.citations = g.citations.filter((c) => {
      const key = c.pmid || c.title || JSON.stringify(c);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return [...map.values()].sort(
    (a, b) => gradeRank[b.grade] - gradeRank[a.grade] || b.best_score - a.best_score,
  );
}

const CitationsBlock = ({ citations }: { citations: Citation[] }) => {
  const [open, setOpen] = useState(false);
  if (!citations.length) return null;
  const preview = citations.slice(0, 2);
  const rest = citations.slice(2);

  const renderCitation = (c: Citation, i: number) => {
    const url =
      c.url || (c.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/` : undefined);
    return (
      <li key={i} className="text-xs text-muted-foreground leading-snug">
        {c.title && <span className="text-foreground font-medium">{c.title}</span>}
        {c.authors && <span> — {c.authors}</span>}
        {(c.journal || c.year) && (
          <span className="italic">
            {" "}
            {c.journal}
            {c.year ? `, ${c.year}` : ""}
          </span>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            {c.pmid ? `PMID:${c.pmid}` : "View"}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </li>
    );
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t pt-3 mt-3">
      <ul className="space-y-1.5 mb-2">{preview.map(renderCitation)}</ul>
      {rest.length > 0 && (
        <>
          <CollapsibleContent>
            <ul className="space-y-1.5 mb-2">{rest.map((c, i) => renderCitation(c, i + preview.length))}</ul>
          </CollapsibleContent>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
              {open ? (
                <>
                  Hide citations <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show {rest.length} more citation{rest.length === 1 ? "" : "s"}{" "}
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </>
      )}
    </Collapsible>
  );
};

const Recommendations = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mapped = DISEASE_MAP.find((d) => d.id === id);
  // Support arbitrary diseases from Open Targets autocomplete:
  // route /conditions/:id where :id is the EFO/MONDO id (e.g. "EFO_0000249")
  // and an optional ?name=... query param provides the display name.
  const otName = searchParams.get("name") || undefined;
  const isOpenTargetsId = !mapped && !!id && /^[A-Za-z]+_[0-9]+$/.test(id);

  const disease = mapped
    ? mapped
    : isOpenTargetsId && id
      ? { name: otName || id.replace(/_/g, ":"), mondoId: id }
      : undefined;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["automation-run", disease?.mondoId],
    queryFn: () => runAutomation(disease!.mondoId),
    enabled: !!disease,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const foods = data ? groupByFood(data.evidence_scores) : [];
  const totalPublications = foods.reduce((sum, f) => sum + f.publication_count, 0);

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
          <div className="mb-6">
            <h1
              className="text-3xl md:text-4xl font-bold text-secondary mb-2"
              style={{ fontFamily: "'Merriweather', serif" }}
            >
              {disease.name}
            </h1>
            <p className="text-muted-foreground">
              Literature-based food recommendations from gene–pathway analysis
            </p>
          </div>

          {/* Academic Mode disclaimer */}
          <div className="mb-8 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-2 text-sm text-amber-900">
            <BookOpen className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              <strong>Academic Mode</strong> — Literature-based evidence from CTD &amp; PubMed.
              Not medical advice.
            </p>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="max-w-lg mx-auto text-center py-16 space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-semibold text-secondary">
                  Searching CTD and PubMed databases…
                </p>
                <p className="text-sm text-muted-foreground">This may take 30–60 seconds</p>
              </div>
              <Progress
                value={undefined}
                className="h-2 w-full [&>div]:animate-[indeterminate_1.5s_ease-in-out_infinite]"
              />
              <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Dna className="h-3 w-3" /> Analyzing genes
                </span>
                <span className="flex items-center gap-1">
                  <Route className="h-3 w-3" /> Mapping pathways
                </span>
                <span className="flex items-center gap-1">
                  <FlaskConical className="h-3 w-3" /> Scoring compounds
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Reviewing literature
                </span>
              </div>
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="max-w-lg mx-auto text-center py-16 space-y-4">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-lg font-semibold text-secondary">Something went wrong</p>
              <p className="text-sm text-muted-foreground">
                {(error as Error)?.message || "An unexpected error occurred."}
              </p>
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

              {totalPublications > 0 && (
                <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Based on <span className="font-semibold text-foreground">{totalPublications}</span>{" "}
                  publication{totalPublications === 1 ? "" : "s"}
                </p>
              )}

              {foods.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <p>No food recommendations found for this condition yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  {foods.map((food) => {
                    const gs = gradeStyles[food.grade];
                    return (
                      <Card
                        key={food.food_name}
                        className="border-primary/10 hover:shadow-lg transition-shadow h-full"
                      >
                        <CardContent className="p-6 flex flex-col h-full">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-2xl">🍎</span>
                              <h3 className="font-bold text-xl text-secondary truncate">
                                {food.food_name}
                              </h3>
                            </div>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-xs font-bold ${gs.className}`}
                            >
                              {gs.label}
                            </Badge>
                          </div>

                          {/* Phytochemical subtext */}
                          {food.entries[0]?.compound_name && (
                            <p className="text-sm text-muted-foreground mb-3">
                              Phytochemical:{" "}
                              <span className="font-medium text-foreground">
                                {food.entries[0].compound_name}
                              </span>
                              {food.entries.length > 1 && (
                                <span className="text-xs"> +{food.entries.length - 1} more</span>
                              )}
                            </p>
                          )}

                          {/* Meta row */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-4">
                            <span>
                              Score:{" "}
                              <span className="font-semibold text-primary">
                                {food.best_score.toFixed(1)}
                              </span>
                            </span>
                            {food.publication_count > 0 && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {food.publication_count} publication
                                {food.publication_count === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>

                          {/* Entries: gene + pathway + interaction */}
                          <div className="space-y-2 flex-1">
                            {food.entries.slice(0, 3).map((entry, i) => (
                              <div
                                key={i}
                                className="text-xs bg-muted/50 rounded p-2.5 space-y-1"
                              >
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge variant="secondary" className="text-[10px] gap-1">
                                    <Dna className="h-2.5 w-2.5" />
                                    {entry.gene_symbol}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] gap-1">
                                    <Route className="h-2.5 w-2.5" />
                                    {entry.pathway_name}
                                  </Badge>
                                  {entry.interaction_type && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] bg-primary/5 border-primary/20"
                                    >
                                      {entry.interaction_type}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                            {food.entries.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{food.entries.length - 3} more interaction
                                {food.entries.length - 3 === 1 ? "" : "s"}
                              </p>
                            )}
                          </div>

                          {/* Citations */}
                          <CitationsBlock citations={food.citations} />
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
