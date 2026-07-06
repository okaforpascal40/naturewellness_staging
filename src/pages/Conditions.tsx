import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { DISEASE_MAP, searchOpenTargetsDiseases, type OpenTargetsDisease } from "@/lib/api";
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
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState("All");
  const navigate = useNavigate();

  const [otResults, setOtResults] = useState<OpenTargetsDisease[]>([]);
  const [otLoading, setOtLoading] = useState(false);
  const [otOpen, setOtOpen] = useState(false);
  const [otError, setOtError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setOtResults([]);
      setOtLoading(false);
      setOtError(null);
      return;
    }
    const controller = new AbortController();
    setOtLoading(true);
    setOtError(null);
    const t = setTimeout(async () => {
      try {
        const results = await searchOpenTargetsDiseases(q, controller.signal);
        setOtResults(results);
      } catch (e: any) {
        if (e.name !== "AbortError") setOtError("Could not load suggestions.");
      } finally {
        setOtLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOtOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelectDisease = (d: OpenTargetsDisease) => {
    setOtOpen(false);
    setSearch("");
    navigate(`/conditions/${d.id}?name=${encodeURIComponent(d.name)}`);
  };

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
          Search any disease or choose from featured conditions below
        </p>
      </div>

      <div className="max-w-3xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-3 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
          <span className="font-semibold text-foreground">{DISEASE_MAP.length}</span> featured conditions
        </span>
      </div>

      {/* Search with Open Targets autocomplete */}
      <div ref={wrapperRef} className="max-w-md mx-auto mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          placeholder="Type any disease name (e.g. Lupus, Parkinson, Diabetes)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOtOpen(true);
          }}
          onFocus={() => setOtOpen(true)}
          className="pl-10"
        />
        {otOpen && search.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
            {otLoading && (
              <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching diseases…
              </div>
            )}
            {!otLoading && otError && (
              <div className="px-4 py-3 text-sm text-destructive">{otError}</div>
            )}
            {!otLoading && !otError && otResults.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                No diseases found.
              </div>
            )}
            {!otLoading &&
              !otError &&
              otResults.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleSelectDisease(d)}
                  className="w-full text-left px-4 py-2.5 hover:bg-accent hover:text-accent-foreground border-b border-border last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-sm text-foreground capitalize">
                    {d.name}
                  </div>
                  {d.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {d.description}
                    </div>
                  )}
                </button>
              ))}
          </div>
        )}
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
