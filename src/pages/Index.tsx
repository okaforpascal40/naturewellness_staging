import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  Loader2,
  Mic,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPlantSuggestions,
  searchOpenTargetsDiseases,
  type OpenTargetsDisease,
} from "@/lib/api";
import { FROM_SEARCH_NAV, conditionPath } from "@/lib/condition-nav";
import { firstNameOf, useUser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SearchMode = "condition" | "plant";

const SEARCH_MODES: { value: SearchMode; label: string }[] = [
  { value: "condition", label: "🔬 Find by Condition" },
  { value: "plant", label: "🌿 Find by Plant/Food" },
];

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

// Friendly labels mapped to disease terms the Open Targets search can resolve,
// so every chip lands on real results instead of an empty state.
const EXAMPLE_CHIPS: { label: string; query: string }[] = [
  { label: "Type 2 Diabetes", query: "type 2 diabetes" },
  { label: "High Blood Pressure", query: "hypertension" },
  { label: "Weight Loss", query: "obesity" },
  { label: "Fatty Liver", query: "fatty liver disease" },
  { label: "Boost Immunity", query: "immunodeficiency" },
  { label: "Healthy Heart", query: "cardiovascular disease" },
];

const PLANT_PLACEHOLDER = "Type a fruit, vegetable or plant...";

const PLANT_CHIPS = [
  "Turmeric",
  "Blueberry",
  "Garlic",
  "Broccoli",
  "Green Tea",
  "Ginger",
  "Spinach",
  "Moringa",
] as const;

/** Path of the results page for a plant or food. */
const plantPath = (name: string): string => `/plant/${encodeURIComponent(name)}`;

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const firstName = user ? firstNameOf(user) : null;

  const [mode, setMode] = useState<SearchMode>("condition");
  const [searchType, setSearchType] = useState<SearchType>("disease");
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);

  // Autocomplete: Open Targets diseases in condition mode (same logic as the
  // Conditions search), our own plant names in plant mode. Loading, error and
  // open state are shared because only one mode's dropdown is ever shown.
  const [otResults, setOtResults] = useState<OpenTargetsDisease[]>([]);
  const [plantResults, setPlantResults] = useState<string[]>([]);
  const [otLoading, setOtLoading] = useState(false);
  const [otOpen, setOtOpen] = useState(false);
  const [otError, setOtError] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setOtResults([]);
      setPlantResults([]);
      setOtLoading(false);
      setOtError(null);
      return;
    }
    const controller = new AbortController();
    // Drop the previous query's results up front: selecting navigates straight
    // away, so Enter must never land on a match for text the user has replaced.
    setOtResults([]);
    setPlantResults([]);
    setOtLoading(true);
    setOtError(null);
    const t = setTimeout(async () => {
      try {
        if (mode === "plant") {
          const names = await getPlantSuggestions(q, controller.signal);
          if (!controller.signal.aborted) setPlantResults(names);
        } else {
          const results = await searchOpenTargetsDiseases(q, controller.signal);
          if (!controller.signal.aborted) setOtResults(results);
        }
      } catch (e: unknown) {
        if (!controller.signal.aborted) setOtError("Could not load suggestions.");
      } finally {
        // A superseded request must not clear the loading flag of its successor.
        if (!controller.signal.aborted) setOtLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query, mode]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOtOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Abort any in-flight speech recognition if the user navigates away.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  // Picking a condition is the user's intent to see results, so go straight
  // there rather than making them confirm with a second button.
  const handleSelect = (d: OpenTargetsDisease) => {
    setOtOpen(false);
    navigate(conditionPath(d.id, d.name), FROM_SEARCH_NAV);
  };

  const handleSelectPlant = (name: string) => {
    setOtOpen(false);
    navigate(plantPath(name));
  };

  // Each mode searches a different catalogue, so carry nothing across.
  const handleModeChange = (next: SearchMode) => {
    if (next === mode) return;
    setMode(next);
    setQuery("");
    setOtResults([]);
    setPlantResults([]);
    setOtError(null);
    setOtOpen(false);
  };

  const handlePlantSearch = () => {
    const name = query.trim();
    // Same stale-result guard as conditions: while the current query's
    // suggestions are pending the top match is unknown, so wait for them.
    if (otLoading) {
      setOtOpen(true);
      inputRef.current?.focus();
      return;
    }
    if (plantResults.length > 0) {
      handleSelectPlant(plantResults[0]);
      return;
    }
    if (name) {
      handleSelectPlant(name);
    } else {
      toast("Type a plant or food to search", {
        description: "For example “Turmeric” or “Blueberry”.",
      });
    }
  };

  const handleSearch = () => {
    if (mode === "plant") {
      handlePlantSearch();
      return;
    }
    // Only auto-select once results for the *current* query have settled, so a
    // pending search can't navigate to a stale result from a previous query.
    if (!otLoading && otResults.length > 0) {
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

  const handleChip = (chipQuery: string) => {
    setQuery(chipQuery);
    setOtOpen(true);
    inputRef.current?.focus();
  };

  const handleVoiceSearch = () => {
    // Toggle off if a recognizer is already in flight. Gate on the ref (assigned
    // synchronously below) rather than the async `listening` state, so a quick
    // second click during the permission prompt can't spawn a duplicate recognizer.
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      toast.error("Voice search not supported", {
        description: "Your browser doesn't support speech recognition. Try Chrome, Edge, or Safari.",
      });
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false; // one-shot final transcript — avoids mid-speech query churn
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    // Calling start() prompts the browser for microphone permission.
    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      transcript = transcript.trim();
      if (!transcript) return;
      // Feed the text into the search box; the debounced effect on `query`
      // automatically fires the Open Targets disease search.
      setQuery(transcript);
      setOtOpen(true);
      inputRef.current?.focus();
    };

    recognition.onerror = (event) => {
      setListening(false);
      recognitionRef.current = null;
      const description =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone access was denied. Enable it in your browser settings and try again."
          : event.error === "no-speech"
            ? "We didn't catch that — please try speaking again."
            : event.error === "audio-capture"
              ? "No microphone was found. Check that one is connected."
              : `Voice search error: ${event.error}`;
      toast.error("Voice search failed", { description });
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (err) {
      setListening(false);
      recognitionRef.current = null;
      toast.error("Could not start voice search", {
        description: (err as Error)?.message || "Please try again.",
      });
    }
  };

  // Typed but not yet picked from the dropdown: offer to go to the best match.
  const hasQuery = query.trim().length >= 2;
  const isPlant = mode === "plant";

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-24 lg:pb-12">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
          {/* ============================ LEFT PANEL ============================ */}
          <Card className="rounded-3xl border-border/70 bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-secondary sm:text-3xl">
                {/* While the session resolves, don't flash "friend" at a signed-in user. */}
                {userLoading ? "Hello" : `Hello, ${firstName ?? "friend"}`}{" "}
                <span className="align-middle">👋</span>
              </h1>
              <p className="mt-1 text-base text-muted-foreground sm:text-lg">
                {firstName
                  ? `What would you like to explore today, ${firstName}?`
                  : "What would you like to explore today?"}
              </p>
            </div>

            {/* Search mode: by condition or by plant/food */}
            <div
              role="group"
              aria-label="Search mode"
              className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-muted/70 p-1"
            >
              {SEARCH_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={mode === m.value}
                  onClick={() => handleModeChange(m.value)}
                  className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm ${
                    mode === m.value
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Search type tabs (condition mode only) */}
            {!isPlant && (
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
            )}

            {/* Search input + autocomplete */}
            <div ref={wrapperRef} className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                placeholder={isPlant ? PLANT_PLACEHOLDER : PLACEHOLDERS[searchType]}
                onChange={(e) => {
                  setQuery(e.target.value);
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
                      <Loader2 className="h-4 w-4 animate-spin" />{" "}
                      {isPlant ? "Searching plants…" : "Searching conditions…"}
                    </div>
                  )}
                  {!otLoading && otError && (
                    <div className="px-4 py-3 text-sm text-destructive">{otError}</div>
                  )}
                  {!otLoading && !otError && isPlant && plantResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      No matching plants. Press Enter to search for “{query.trim()}”.
                    </div>
                  )}
                  {!otLoading &&
                    !otError &&
                    isPlant &&
                    plantResults.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSelectPlant(name)}
                        className="block w-full border-b border-border px-4 py-2.5 text-left text-sm font-medium capitalize text-foreground transition-colors last:border-b-0 hover:bg-accent/15"
                      >
                        {name}
                      </button>
                    ))}
                  {!otLoading && !otError && !isPlant && otResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No conditions found.</div>
                  )}
                  {!otLoading &&
                    !otError &&
                    !isPlant &&
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
              {isPlant
                ? PLANT_CHIPS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectPlant(name)}
                      className="rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-accent/15 hover:text-primary"
                    >
                      {name}
                    </button>
                  ))
                : EXAMPLE_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleChip(chip.query)}
                      className="rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-accent/15 hover:text-primary"
                    >
                      {chip.label}
                    </button>
                  ))}
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <Button
                onClick={handleSearch}
                className="h-12 w-full rounded-2xl bg-primary text-base font-semibold shadow-sm hover:bg-primary/90"
              >
                {hasQuery ? (
                  <>
                    {isPlant ? "Explore Health Benefits" : "Get Recommendations"}{" "}
                    <ArrowRight className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" /> Search
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleVoiceSearch}
                aria-pressed={listening}
                className={`h-12 w-full rounded-2xl text-base font-medium transition-colors ${
                  listening
                    ? "animate-pulse border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/15"
                    : "border-primary/30 text-primary hover:bg-accent/10"
                }`}
              >
                <Mic className="h-5 w-5" /> {listening ? "Listening…" : "Voice Search"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/camscan")}
                className="h-12 w-full rounded-2xl border-primary/30 text-base font-medium text-primary transition-colors hover:bg-accent/10"
              >
                <Camera className="h-5 w-5" /> Scan Plant 📷
              </Button>
            </div>
          </Card>

          {/* ============================ RIGHT PANEL ============================ */}
            <div className="hidden flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/40 p-10 text-center lg:flex">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-primary">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-secondary">
                Search to build your query
              </h2>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                {isPlant
                  ? "Pick a plant or food on the left and we'll surface the health conditions its phytochemicals act on, graded by published evidence."
                  : "Pick a condition on the left and we'll surface plant foods, nutrients and the genes and pathways behind them."}
              </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
