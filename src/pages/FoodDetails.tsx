import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MechanisticPathways from "@/components/MechanisticPathways";

const FoodDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: food, isLoading: loadingFood } = useQuery({
    queryKey: ["food", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("foods")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: links, isLoading: loadingLinks } = useQuery({
    queryKey: ["food_links_by_food", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_condition_links")
        .select("*, health_conditions(*)")
        .eq("food_id", id!)
        .eq("approved_for_public", true);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const isLoading = loadingFood || loadingLinks;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!food) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Food not found.</p>
        <Button variant="link" onClick={() => navigate(-1)}>← Back</Button>
      </div>
    );
  }

  const compounds = Array.isArray(food.compounds) ? food.compounds as string[] : [];
  const nutrientsRaw = food.nutrients && typeof food.nutrients === "object" && !Array.isArray(food.nutrients)
    ? (typeof food.nutrients === "string" ? JSON.parse(food.nutrients) : food.nutrients) as { usdaId?: string; nutrients?: { name: string; amount: number; unit: string }[] }
    : null;
  const nutrientList = nutrientsRaw?.nutrients ?? [];
  const usdaId = nutrientsRaw?.usdaId;

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="flex items-center gap-4 mb-6">
        <span className="text-5xl">{food.emoji || "🍎"}</span>
        <div>
          <h1 className="text-3xl font-bold text-secondary">{food.name}</h1>
          {food.scientific_name && (
            <p className="text-muted-foreground italic">{food.scientific_name}</p>
          )}
          {food.category && (
            <Badge variant="outline" className="mt-1">{food.category}</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="nutrients">Nutrients</TabsTrigger>
          <TabsTrigger value="compounds">Compounds</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="p-6 space-y-5">
              {compounds.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Key Compounds</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {compounds.map((c) => (
                      <Badge key={String(c)} variant="outline" className="border-primary/30 text-primary">{String(c)}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {links && links[0]?.mechanism && (
                <div>
                  <h3 className="font-semibold mb-2">Mechanism of Action</h3>
                  <p className="text-sm text-muted-foreground">{links[0].mechanism}</p>
                </div>
              )}

              <MechanisticPathways
                foodName={food.name}
                compounds={compounds}
                conditionIds={links?.map((l) => l.condition_id) ?? []}
                conditionNames={Object.fromEntries(
                  (links ?? []).map((l) => [l.condition_id, (l.health_conditions as any)?.name ?? "Unknown"])
                )}
              />

              {links && links.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Related Conditions</h3>
                  <div className="flex flex-wrap gap-2">
                    {links.map((l) => {
                      const cond = l.health_conditions as any;
                      return cond ? (
                        <Badge key={l.id} variant="secondary" className="cursor-pointer hover:bg-primary/10"
                          onClick={() => navigate(`/conditions/${cond.id}`)}>
                          {cond.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {food.warnings && (
                <div>
                  <h3 className="font-semibold mb-2 text-destructive">⚠️ Warnings & Contraindications</h3>
                  <p className="text-sm text-muted-foreground">{food.warnings}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nutrients">
          <Card>
            <CardContent className="p-6">
              {usdaId && (
                <p className="text-sm text-muted-foreground mb-4">USDA Food ID: {usdaId}</p>
              )}
              {nutrientList.length > 0 ? (
                <div className="space-y-2">
                  {nutrientList.map((nutrient, index) => (
                    <div key={index} className="flex justify-between p-3 bg-muted/50 rounded border border-border/50 text-sm">
                      <span className="font-medium">{nutrient.name}</span>
                      <span className="text-muted-foreground">{nutrient.amount} {nutrient.unit}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No nutrient data yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compounds">
          <Card>
            <CardContent className="p-6">
              {compounds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {compounds.map((c) => (
                    <Badge key={String(c)} className="bg-primary/10 text-primary border border-primary/20 text-sm px-3 py-1">
                      {String(c)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No compound data yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="research">
          <Card>
            <CardContent className="p-6 space-y-4">
              {links?.some((l) => l.pubmed_refs?.length) ? (
                links.flatMap((l) =>
                  (l.pubmed_refs || []).map((ref) => (
                    <div key={ref} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">PubMed</Badge>
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${ref.replace("PMID:", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {ref}
                      </a>
                    </div>
                  ))
                )
              ) : (
                <p className="text-muted-foreground">No references yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-4 rounded-lg border bg-muted/50 text-xs text-muted-foreground">
        ⚠️ This information is for educational purposes only and is not medical advice. Always consult your healthcare provider.
      </div>
    </div>
  );
};

export default FoodDetails;
