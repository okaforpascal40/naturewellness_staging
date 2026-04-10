import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { DISEASE_MAP } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const categoryColors: Record<string, string> = {
  Metabolic: "bg-blue-100 text-blue-800 border-blue-200",
  Cardiovascular: "bg-red-100 text-red-800 border-red-200",
  Immune: "bg-orange-100 text-orange-800 border-orange-200",
  Neurological: "bg-purple-100 text-purple-800 border-purple-200",
  Cellular: "bg-teal-100 text-teal-800 border-teal-200",
};

const categories = ["All", ...new Set(DISEASE_MAP.map((d) => d.category))];

const Conditions = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = DISEASE_MAP.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
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
          Choose a condition to discover AI-powered food recommendations
        </p>
      </div>

      <div className="max-w-3xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-3 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
          <span className="font-semibold text-foreground">{DISEASE_MAP.length}</span> conditions
        </span>
      </div>

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

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {filtered.map((condition) => (
          <Link key={condition.id} to={`/conditions/${condition.id}`}>
            <Card className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-primary/10 h-full">
              <CardContent className="p-6 flex flex-col h-full">
                <Badge
                  variant="outline"
                  className={`w-fit text-xs mb-3 ${categoryColors[condition.category] || "bg-muted text-muted-foreground"}`}
                >
                  {condition.category}
                </Badge>
                <h3 className="text-lg font-bold text-secondary mb-2">
                  {condition.name}
                </h3>
                <p className="text-sm text-muted-foreground flex-1 mb-3">
                  {condition.description}
                </p>
                <div className="flex items-center text-primary text-sm font-medium">
                  Explore recommendations
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p>No conditions found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default Conditions;
