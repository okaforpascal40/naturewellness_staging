import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

const categoryColors: Record<string, string> = {
  Metabolic: "bg-blue-100 text-blue-800 border-blue-200",
  Cardiovascular: "bg-red-100 text-red-800 border-red-200",
  Immune: "bg-orange-100 text-orange-800 border-orange-200",
  Neurological: "bg-purple-100 text-purple-800 border-purple-200",
  Cellular: "bg-teal-100 text-teal-800 border-teal-200",
};

const categories = ["All", "Metabolic", "Cardiovascular", "Immune", "Neurological", "Cellular"];

function getEvidenceBadge(score: number | null) {
  if (score == null) return null;
  if (score >= 80) return { label: `Strong Evidence (${score})`, className: "bg-green-100 text-green-800 border-green-300" };
  if (score >= 60) return { label: `Moderate Evidence (${score})`, className: "bg-yellow-100 text-yellow-800 border-yellow-300" };
  return { label: `Emerging Evidence (${score})`, className: "bg-orange-100 text-orange-800 border-orange-300" };
}

const ACADEMIC_KEY = "conditions-academic-mode";

const Conditions = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [academicMode, setAcademicMode] = useState(() => {
    try { return localStorage.getItem(ACADEMIC_KEY) === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(ACADEMIC_KEY, String(academicMode)); } catch {}
  }, [academicMode]);

  const { data: conditions, isLoading } = useQuery({
    queryKey: ["health_conditions", academicMode],
    queryFn: async () => {
      let query = supabase.from("health_conditions").select("*");
      if (!academicMode) {
        query = query.eq("public_display_status", true);
      }
      query = academicMode
        ? query.order("automated_evidence_score", { ascending: false })
        : query.order("name");
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Stats: total count (all conditions)
  const { data: totalCount } = useQuery({
    queryKey: ["health_conditions_total"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("health_conditions")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: approvedCount } = useQuery({
    queryKey: ["health_conditions_approved"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("health_conditions")
        .select("*", { count: "exact", head: true })
        .eq("public_display_status", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const filtered = conditions?.filter((c: any) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesCategory = activeCategory === "All" || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-2">
          Select a Health Condition
        </h1>
        <p className="text-muted-foreground">
          Choose a condition to discover science-backed food recommendations
        </p>
      </div>

      {/* Stats bar */}
      <div className="max-w-3xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-3 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-semibold text-foreground">{filtered?.length ?? 0}</span> of{" "}
          <span className="font-semibold text-foreground">{totalCount ?? 0}</span> conditions
          {" | "}
          <span className="font-semibold text-foreground">{approvedCount ?? 0}</span> approved for public
        </span>

        {/* Academic toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Switch checked={academicMode} onCheckedChange={setAcademicMode} />
          <span className={`font-medium ${academicMode ? "text-amber-700" : "text-foreground"}`}>
            {academicMode ? "Academic Mode" : "Public Mode"}
          </span>
        </label>
      </div>

      {/* Academic warning banner */}
      {academicMode && (
        <div className="max-w-3xl mx-auto mb-6">
          <Alert className="border-amber-400 bg-[#FEF3C7] text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="ml-2 text-sm font-medium leading-snug">
              <span className="font-bold">Academic Mode Active:</span> Showing all conditions including those pending expert validation. This mode is for research and educational purposes only. Do not use for medical decisions.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Search */}
      <div className="max-w-md mx-auto mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conditions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Grid */}
      {!isLoading && filtered && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {filtered.map((condition: any) => {
            const evidence = academicMode ? getEvidenceBadge(condition.automated_evidence_score) : null;
            return (
              <Link key={condition.id} to={`/conditions/${condition.id}`}>
                <Card className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-primary/10 h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge
                        variant="outline"
                        className={`text-xs ${categoryColors[condition.category] || "bg-muted text-muted-foreground"}`}
                      >
                        {condition.category}
                      </Badge>
                      {evidence && (
                        <Badge variant="outline" className={`text-xs ${evidence.className}`}>
                          {evidence.label}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-secondary mb-2">
                      {condition.name}
                    </h3>
                    <p className="text-sm text-muted-foreground flex-1 mb-3">
                      {condition.description}
                    </p>
                    {academicMode && condition.source_database && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Source: <span className="font-medium">{condition.source_database}</span>
                      </p>
                    )}
                    <div className="flex items-center text-primary text-sm font-medium">
                      Explore recommendations
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered?.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p>No conditions found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default Conditions;
