import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockConditions } from "@/lib/mock-data";

const Conditions = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(mockConditions.map((c) => c.category))], []);

  const filtered = useMemo(() => {
    return mockConditions.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesCat = !activeCategory || c.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, activeCategory]);

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-secondary mb-2">Select Your Health Condition</h1>
      <p className="text-muted-foreground mb-6">Browse conditions to find science-backed food recommendations.</p>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conditions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Button
          variant={!activeCategory ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveCategory(null)}
        >
          All
        </Button>
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Link key={c.id} to={`/conditions/${c.id}`}>
            <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {c.name}
                  </h3>
                  <Badge variant="secondary" className="mt-1 text-xs">{c.category}</Badge>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No conditions found matching your search.</p>
      )}
    </div>
  );
};

export default Conditions;
