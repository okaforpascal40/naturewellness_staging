import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";

const evidenceBadge: Record<string, { label: string; className: string }> = {
  strong: { label: "✓✓✓ Strong Evidence", className: "bg-green-100 text-green-800 border-green-200" },
  moderate: { label: "✓✓ Moderate Evidence", className: "bg-amber-100 text-amber-800 border-amber-200" },
  emerging: { label: "✓ Emerging Evidence", className: "bg-blue-100 text-blue-800 border-blue-200" },
};

const Recommendations = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAcademic, setShowAcademic] = useState(false);

  const { data: condition, isLoading: loadingCondition } = useQuery({
    queryKey: ["condition", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_conditions")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: links, isLoading: loadingLinks } = useQuery({
    queryKey: ["food_links", id, showAcademic],
    queryFn: async () => {
      let query = supabase
        .from("food_condition_links")
        .select("*, foods(*)")
        .eq("condition_id", id!)
        .eq("approved_for_public", true);

      if (!showAcademic) {
        query = query.eq("layer", "health-safe");
      }

      const { data, error } = await query.order("evidence_level");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const isLoading = loadingCondition || loadingLinks;

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Back */}
      <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate("/conditions")}>
        <ArrowLeft className="h-4 w-4" /> Back to Conditions
      </Button>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && condition && (
        <>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-2" style={{ fontFamily: "'Merriweather', serif" }}>
              {condition.name}
            </h1>
            <p className="text-muted-foreground mb-4">Science-backed food recommendations</p>
            <p className="text-sm text-muted-foreground">
              {links?.length ?? 0} food{(links?.length ?? 0) !== 1 ? "s" : ""} recommended
            </p>
          </div>

          {/* Academic toggle */}
          <div className="flex items-center gap-3 mb-6 p-4 rounded-lg border bg-card">
            <Switch
              id="academic"
              checked={showAcademic}
              onCheckedChange={setShowAcademic}
            />
            <Label htmlFor="academic" className="cursor-pointer text-sm font-medium">
              Show Research Data
            </Label>
          </div>

          {showAcademic && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 mb-6">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                ⚠️ Research data shown below is computational/predictive. NOT clinically validated. For academic exploration only.
              </p>
            </div>
          )}

          {/* Food cards grid */}
          {links && links.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {links.map((link) => {
                const food = link.foods as any;
                const evidence = evidenceBadge[link.evidence_level] || evidenceBadge.emerging;
                return (
                  <Card key={link.id} className="border-primary/10 hover:shadow-lg transition-shadow h-full">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{food?.emoji || "🍎"}</span>
                        <div>
                          <h3 className="font-bold text-secondary">{food?.name}</h3>
                          {food?.scientific_name && (
                            <p className="text-xs text-muted-foreground italic">{food.scientific_name}</p>
                          )}
                        </div>
                      </div>

                      {food?.category && (
                        <Badge variant="outline" className="w-fit mb-2 text-xs">
                          {food.category}
                        </Badge>
                      )}

                      <Badge variant="outline" className={`w-fit mb-3 text-xs ${evidence.className}`}>
                        {evidence.label}
                      </Badge>

                      {/* Key compounds */}
                      {link.key_compounds && link.key_compounds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {link.key_compounds.map((compound: string) => (
                            <span
                              key={compound}
                              className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5"
                            >
                              {compound}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Mechanism */}
                      {link.mechanism && (
                        <p className="text-sm text-muted-foreground flex-1 mb-4 line-clamp-3">
                          {link.mechanism}
                        </p>
                      )}

                      {link.layer === "academic" && (
                        <Badge variant="outline" className="w-fit mb-3 text-xs bg-purple-100 text-purple-800 border-purple-200">
                          Academic
                        </Badge>
                      )}

                      <Link to={`/foods/${food?.id}?conditionId=${link.condition_id}`} className="mt-auto">
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>No recommendations found yet. Check back soon as our database grows.</p>
            </div>
          )}

          <MedicalDisclaimer />
        </>
      )}
    </div>
  );
};

export default Recommendations;
