import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockFoods, mockLinks, mockConditions } from "@/lib/mock-data";

const FoodDetails = () => {
  const { id } = useParams<{ id: string }>();
  const food = mockFoods.find((f) => f.id === id);
  const relatedLinks = mockLinks.filter((l) => l.food_id === id && l.approved_for_public && l.layer === "health-safe");

  if (!food) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Food not found.</p>
        <Link to="/conditions"><Button variant="link">← Back</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link to="/conditions">
        <Button variant="ghost" size="sm" className="mb-4 gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <span className="text-5xl">{food.emoji}</span>
        <div>
          <h1 className="text-3xl font-bold text-secondary">{food.name}</h1>
          {food.scientific_name && (
            <p className="text-muted-foreground italic">{food.scientific_name}</p>
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
              <div>
                <h3 className="font-semibold mb-2">Related Conditions</h3>
                <div className="flex flex-wrap gap-2">
                  {relatedLinks.map((l) => {
                    const cond = mockConditions.find((c) => c.id === l.condition_id);
                    return cond ? (
                      <Link key={l.id} to={`/conditions/${cond.id}`}>
                        <Badge variant="secondary" className="cursor-pointer hover:bg-primary/10">{cond.name}</Badge>
                      </Link>
                    ) : null;
                  })}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Key Phytochemicals</h3>
                <div className="flex flex-wrap gap-1.5">
                  {food.compounds?.map((c) => (
                    <Badge key={c} variant="outline" className="border-primary/30 text-primary">{c}</Badge>
                  ))}
                </div>
              </div>
              {relatedLinks[0] && (
                <div>
                  <h3 className="font-semibold mb-2">Mechanism of Action</h3>
                  <p className="text-sm text-muted-foreground">{relatedLinks[0].mechanism_summary}</p>
                </div>
              )}
              {food.warnings && food.warnings.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-destructive">⚠️ Warnings</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {food.warnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nutrients">
          <Card>
            <CardContent className="p-6">
              {food.nutrients ? (
                <div className="space-y-2">
                  {Object.entries(food.nutrients).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/50 pb-2 text-sm">
                      <span className="font-medium">{k}</span>
                      <span className="text-muted-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No nutrient data available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compounds">
          <Card>
            <CardContent className="p-6">
              {food.compounds && food.compounds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {food.compounds.map((c) => (
                    <Badge key={c} className="bg-primary/10 text-primary border border-primary/20 text-sm px-3 py-1">{c}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No compound data available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="research">
          <Card>
            <CardContent className="p-6 space-y-4">
              {relatedLinks.some((l) => l.pubmed_refs?.length) ? (
                relatedLinks.flatMap((l) =>
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
                <p className="text-muted-foreground">No references available yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FoodDetails;
