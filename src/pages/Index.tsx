import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  History,
  Home,
  Languages,
  Loader2,
  Mic,
  Search,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { searchOpenTargetsDiseases, type OpenTargetsDisease } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SearchType = "disease" | "symptom" | "goal" | "organ";

const SEARCH_TYPES: { value: SearchType; label: string }[] = [
  { value: "disease", label: "Disease" },
  { value: "symptom", label: "Symptom" },
  { value: "goal", label: "Health Goal" },
  { value: "organ", label: "Organ" },
];

const PLACEHOLDERS: Record<SearchType, string> = {
  disease: "Type a disease, symptom, or health goal...",
  symptom: "Describe a symptom you're experiencing...",
  goal: "Enter a health goal (e.g. boost immunity)...",
  organ: "Enter an organ or body system...",
};

const EXAMPLE_CHIPS = [
  "Type 2 Diabetes",
  "High Blood Pressure",
  "Weight Loss",
  "Fatty Liver",
  "Boost Immunity",
  "Healthy Heart",
];

const LANGUAGES = ["English", "Spanish", "French", "Arabic", "Hindi", "Mandarin", "Swahili"];

const comingSoon = (label: string) =>
  toast(`${label} is coming soon`, { description: "This feature isn't available yet." });

const Index = () => {
  const navigate = useNavigate();

  const [searchType, setSearchType] = useState<SearchType>("disease");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<OpenTargetsDisease | null>(null);
  const [nlText, setNlText] = useState("");
  const [language, setLanguage] = useState("English");

  // Open Targets autocomplete (same logic as the Conditions search)
  const [otResults, setOtResults] = useState<OpenTargetsDisease[]>([]);
  const [otLoading, setOtLoading] = useState(false);
  const [otOpen, setOtOpen] = useState(false);
  const [otError, setOtError] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
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
      } catch (e: unknown) {
        if ((e as Error)?.name !== "AbortError") setOtError("Could not load suggestions.");
      } finally {
        setOtLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOtOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (d: OpenTargetsDisease) => {
    setSelected(d);
    setQuery(d.name);
    setOtOpen(false);
    // Bring the query panel into view on small screens.
    window.setTimeout(() => {
      queryPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleSearch = () => {
    if (otResults.length > 0) {
      handleSelect(otResults[0]);
      return;
    }
    if (query.trim().length >= 2) {
      setOtOpen(true);
      inputRef.current?.focus();
    } else {
      toast("Type a condition to search", {
        description: "Enter at least 2 characters, e.g. “Type 2 Diabetes”.",
      });
    }
  };

  const handleChip = (chip: string) => {
    setSelected(null);
    setQuery(chip);
    setOtOpen(true);
    inputRef.current?.focus();
  };

  const handleGetRecommendations = () => {
    if (!selected) return;
    navigate(`/conditions/${selected.id}?name=${encodeURIComponent(selected.name)}`);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-24 lg:pb-12">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
          {/* ============================ LEFT PANEL ============================ */}
          <Card className="rounded-3xl border-border/70 bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-secondary sm:text-3xl">
                Hello there <span className="align-middle">👋</span>
              </h1>
              <p className="mt-1 text-base text-muted-foreground sm:text-lg">
                What would you like to explore today?
              </p>
            </div>

            {/* Search type tabs */}
            <Tabs value={searchType} onValueChange={(v) => setSearchType(v as SearchType)} className="mb-4">
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/70 p-1">
                {SEARCH_TYPES.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:text-sm"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Search input + autocomplete */}
            <div ref={wrapperRef} className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                placeholder={PLACEHOLDERS[searchType]}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                  setOtOpen(true);
                }}
                onFocus={() => setOtOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="h-14 rounded-2xl border-border/80 bg-background pl-12 pr-4 text-base shadow-sm focus-visible:ring-primary"
              />
              {otOpen && query.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl">
                  {otLoading && (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Searching conditions…
                    </div>
                  )}
                  {!otLoading && otError && (
                    <div className="px-4 py-3 text-sm text-destructive">{otError}</div>
                  )}
                  {!otLoading && !otError && otResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No conditions found.</div>
                  )}
                  {!otLoading &&
                    !otError &&
                    otResults.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelect(d)}
                        className="block w-full border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/15"
                      >
                        <div className="text-sm font-medium capitalize text-foreground">{d.name}</div>
                        {d.description && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {d.description}
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Example chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChip(chip)}
                  className="rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-accent/15 hover:text-primary"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <Button
                onClick={handleSearch}
                className="h-12 w-full rounded-2xl bg-primary text-base font-semibold shadow-sm hover:bg-primary/90"
              >
                <Search className="h-5 w-5" /> Search
              </Button>
              <Button
                variant="outline"
                onClick={() => comingSoon("Voice search")}
                className="h-12 w-full rounded-2xl border-primary/30 text-base font-medium text-primary hover:bg-accent/10"
              >
                <Mic className="h-5 w-5" /> Voice Search
              </Button>
            </div>
          </Card>

          {/* ============================ RIGHT PANEL ============================ */}
          {selected ? (
            <Card
              ref={queryPanelRef}
              className="animate-fade-in scroll-mt-24 rounded-3xl border-border/70 bg-card p-6 shadow-sm sm:p-8"
            >
              <div className="mb-6 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => {
                    setSelected(null);
                    inputRef.current?.focus();
                  }}
                  aria-label="Back to search"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-xl font-bold text-secondary">Query Input</h2>
              </div>

              <label className="mb-1.5 block text-sm font-medium text-foreground">Condition</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={selected.name}
                  readOnly
                  className="h-12 rounded-2xl bg-muted/40 pl-11 text-base font-medium capitalize"
                />
              </div>

              {/* OR — natural language */}
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Or describe your symptoms
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Natural language input
              </label>
              <Textarea
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                placeholder="e.g. I often feel tired after meals and my fasting sugar runs high…"
                className="min-h-[110px] rounded-2xl bg-background text-base"
              />

              {/* Preferred language */}
              <div className="mt-5">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Preferred Language
                </label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-12 rounded-2xl text-base">
                    <span className="flex items-center gap-2">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGetRecommendations}
                className="mt-6 h-12 w-full rounded-2xl bg-primary text-base font-semibold shadow-sm hover:bg-primary/90"
              >
                Get Recommendations <ArrowRight className="h-5 w-5" />
              </Button>
            </Card>
          ) : (
            <div className="hidden flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/40 p-10 text-center lg:flex">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-primary">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-secondary">
                Search to build your query
              </h2>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Pick a condition on the left and we'll surface plant foods, nutrients and the genes
                and pathways behind them.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================ BOTTOM NAV (mobile) ============================ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-primary"
          >
            <Home className="h-5 w-5" /> Home
          </button>
          <button
            type="button"
            onClick={() => comingSoon("History")}
            className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground"
          >
            <History className="h-5 w-5" /> History
          </button>
          <button
            type="button"
            onClick={() => comingSoon("Favorites")}
            className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground"
          >
            <Heart className="h-5 w-5" /> Favorites
          </button>
          <button
            type="button"
            onClick={() => comingSoon("Profile")}
            className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground"
          >
            <User className="h-5 w-5" /> Profile
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Index;
