import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mockConditions, mockFoods, mockLinks } from "@/lib/mock-data";

const evidenceBadge = (level: string) => {
  switch (level) {
    case "strong":
      return <Badge className="bg-primary text-primary-foreground">✓✓✓ Strong Evidence</Badge>;
    case "moderate":
      return <Badge className="bg-accent text-accent-foreground">✓✓ Moderate Evidence</Badge>;
    case "emerging":
      return <Badge className="bg-primary/60 text-primary-foreground">✓ Emerging Evidence</Badge>;
    default:
      return null;
  }
};

const Recommendations = () => {
  const { id } = useParams<{ id: string }>();
  const [showAcademic, setShowAcademic] = useState(false);

  const condition = mockConditions.find((c) => c.id === id);

  const links = useMemo(() => {
    return mockLinks.filter((l) => {
      if (l.condition_id !== id) return false;
      if (!l.approved_for_public) return false;
      if (!showAcademic && l.layer !== "health-safe") return false;
      return true;
    });
  }, [id, showAcademic]);

  if (!condition) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Condition not found.</p>
        <Link to="/conditions"><Button variant="link">← Back to conditions</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <Link to="/conditions">
        <Button variant="ghost" size="sm" className="mb-4 gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Conditions
        </Button>
      </Link>

      <h1 className="text-3xl font-bold text-secondary mb-1">{condition.name}</h1>
      <p className="text-muted-foreground mb-6">Science-backed food recommendations</p>

      {/* Academic toggle */}
      <div className="flex items-center gap-3 mb-4">
        <Switch id="academic" checked={showAcademic} onCheckedChange={setShowAcademic} />
        <Label htmlFor="academic" className="text-sm cursor-pointer">Show Research/Academic Data</Label>
      </div>
      {showAcademic && (
        <Alert className="mb-6 border-accent/40 bg-accent/10">
          <AlertDescription className="text-sm">
            ⚠️ Academic data includes preliminary research not yet validated for general health guidance. Use with caution.
          </AlertDescription>
        </Alert>
      )}

      {/* Food cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {links.map((link) => {
          const food = mockFoods.find((f) => f.id === link.food_id);
          if (!food) return null;
          return (
            <Card key={link.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{food.emoji}</span>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{food.name}</h3>
                      {food.scientific_name && (
                        <p className="text-xs text-muted-foreground italic">{food.scientific_name}</p>
                      )}
                    </div>
                  </div>
                  {evidenceBadge(link.evidence_level)}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {link.key_compounds.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs border-primary/30 text-primary">
                      {c}
                    </Badge>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{link.mechanism_summary}</p>

                <Link to={`/foods/${food.id}`}>
                  <Button variant="outline" size="sm">View Details</Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {links.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No recommendations found for this condition.</p>
      )}
    </div>
  );
};

export default Recommendations;
