import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Database,
  Dna,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  Heart,
  Loader2,
  Map as MapIcon,
  Network,
  Route as RouteIcon,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { DISEASE_MAP, runAutomation, type Recommendation } from "@/lib/api";
import {
  isFavorite,
  removeFromFavorites,
  saveToFavorites,
  saveToHistory,
} from "@/lib/storage";
import {
  GRADE_META,
  dataSourceLabel,
  evidenceType,
  gradeDistribution,
  gradeMeta,
  getFoodVisual,
  mechanismText,
  servingInfo,
  servingQuantity,
  topBenefitAreas,
  topFoods,
  uniqueNonEmpty,
} from "@/lib/food-display";
import {
  DATA_SOURCES,
  DATA_SOURCE_SUMMARY,
  PUBMED_HINT,
  groupReferences,
  pmidsFor,
  pubmedUrl,
  totalPublicationCount,
  uniquePmidCount,
} from "@/lib/citations";
import { generateHealthSummary } from "@/lib/ai-summary";
import { downloadRecommendationsPdf } from "@/lib/pdf";
import FoodAvatar from "@/components/FoodAvatar";
import LoadingCard from "@/components/LoadingCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "academic" | "private";

const TABS = [
  { value: "summary", label: "Summary" },
  { value: "foods", label: "Foods & Nutrients" },
  { value: "genes", label: "Genes & Pathways" },
  { value: "mechanisms", label: "Mechanisms" },
  { value: "serving", label: "Serving & Preparation" },
  { value: "references", label: "References" },
];

const comingSoon = (label: string) =>
  toast(`${label} is coming soon`, { description: "This feature isn't available yet." });

/** Public app URL used in shared messages. */
const SHARE_URL = "https://naturewellness-staging.vercel.app";

/** Shared chip styling for the source / evidence-type labels on a reference. */
const CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground/75";

const Recommendations = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("academic");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  // Controlled so the Summary tab's "View All References" button can jump tabs.
  const [tab, setTab] = useState("summary");
  const [openSources, setOpenSources] = useState<Set<string>>(new Set());
  const referencesTabRef = useRef<HTMLButtonElement>(null);

  /**
   * Jumping tabs unmounts the button that was clicked, so keyboard focus would
   * fall back to the document. Hand it to the References tab instead, which
   * both keeps the user oriented and announces the new tab.
   */
  const goToReferences = () => {
    setTab("references");
    requestAnimationFrame(() => referencesTabRef.current?.focus());
  };

  const mapped = DISEASE_MAP.find((d) => d.id === id);
  const otName = searchParams.get("name") || undefined;
  const isOpenTargetsId = !mapped && !!id && /^[A-Za-z]+_[0-9]+$/.test(id);

  const disease = mapped
    ? mapped
    : isOpenTargetsId && id
      ? { name: otName || id.replace(/_/g, ":"), mondoId: id }
      : undefined;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["automation-run", disease?.mondoId],
    queryFn: () => runAutomation(disease!.mondoId),
    enabled: !!disease,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const recommendations: Recommendation[] = useMemo(
    () => data?.recommendations ?? [],
    [data],
  );

  const foods = useMemo(() => topFoods(recommendations), [recommendations]);

  // Favorites + history persistence. Primitive deps keep the effects from
  // re-firing on every render (the OT `disease` object is rebuilt each render).
  const [saved, setSaved] = useState(false);
  const diseaseName = disease?.name;
  const diseaseMondo = disease?.mondoId;

  useEffect(() => {
    setSaved(id ? isFavorite(id) : false);
  }, [id]);

  useEffect(() => {
    if (id && diseaseName && diseaseMondo && recommendations.length > 0) {
      saveToHistory({ id, name: diseaseName, mondoId: diseaseMondo }, recommendations);
    }
  }, [id, diseaseName, diseaseMondo, recommendations]);

  const handleToggleSave = () => {
    if (!id || !diseaseName || !diseaseMondo) return;
    if (saved) {
      removeFromFavorites(id);
      setSaved(false);
      toast("Removed from Favorites");
    } else {
      saveToFavorites({ id, name: diseaseName, mondoId: diseaseMondo }, recommendations);
      setSaved(true);
      toast.success("Saved to Favorites!");
    }
  };

  const genes = useMemo(
    () => uniqueNonEmpty(recommendations.map((r) => r.gene_target)),
    [recommendations],
  );
  const pathways = useMemo(
    () => uniqueNonEmpty(recommendations.map((r) => r.pathway)),
    [recommendations],
  );
  const benefits = useMemo(() => topBenefitAreas(pathways), [pathways]);
  const distribution = useMemo(() => gradeDistribution(recommendations), [recommendations]);

  const mechanisms = useMemo(() => {
    const seen = new Set<string>();
    const out: { text: string; sub: string }[] = [];
    for (const r of recommendations) {
      const text = mechanismText(r.interaction_type, r.gene_target);
      if (seen.has(text)) continue;
      seen.add(text);
      out.push({ text, sub: [r.phytochemical, r.pathway].filter(Boolean).join(" · ") });
    }
    return out;
  }, [recommendations]);

  // One academic entry per (phytochemical, gene) pair that carries citations.
  const referenceGroups = useMemo(() => groupReferences(recommendations), [recommendations]);
  const citedPmidCount = useMemo(() => uniquePmidCount(referenceGroups), [referenceGroups]);

  // Counted once per pair: the API repeats a pair for every food carrying the
  // compound, so summing the rows would multiply the same literature.
  const totalPublications = useMemo(
    () => totalPublicationCount(recommendations),
    [recommendations],
  );

  const toggleFavorite = (key: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Rows are addressed by position, so a new condition's results must not
  // inherit the previous one's expanded cards.
  useEffect(() => {
    setOpenSources(new Set());
  }, [recommendations]);

  const toggleSources = (key: string) =>
    setOpenSources((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // ── AI summary ────────────────────────────────────────────────────────────
  // Loaded lazily once results land, so it never delays the recommendations.
  // Failure hides the section: it is an aid to reading the data, not the data.
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryFailed, setSummaryFailed] = useState(false);

  const topGrade = useMemo(() => {
    const best = distribution.find((row) => row.count > 0);
    return best ? `Grade ${best.key}` : "mixed";
  }, [distribution]);

  useEffect(() => {
    if (!diseaseName || recommendations.length === 0) return;

    const controller = new AbortController();
    setSummaryLoading(true);
    setSummaryFailed(false);

    generateHealthSummary(
      {
        diseaseName,
        topFoods: foods.map((f) => f.name),
        topPhytochemicals: uniqueNonEmpty(recommendations.map((r) => r.phytochemical)),
        topGenes: genes,
        evidenceGrade: topGrade,
      },
      controller.signal,
    )
      .then((text) => setSummary(text))
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("AI summary failed:", err);
        setSummaryFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSummaryLoading(false);
      });

    return () => controller.abort();
  }, [diseaseName, recommendations, foods, genes, topGrade]);

  const handleShare = async () => {
    const name = disease?.name ?? "this condition";
    const gradeACount = recommendations.filter((r) => r.evidence_grade === "A").length;
    const picks = foods.slice(0, 3).map((f) => f.name).join(", ");
    const text =
      `I just found ${foods.length} evidence-based plant foods for ${name} on NatureWellness 47:12!\n\n` +
      (picks ? `Top picks: ${picks}\n\n` : "") +
      `Evidence: ${gradeACount} Grade A source${gradeACount === 1 ? "" : "s"}\n\n` +
      `Check it out: ${SHARE_URL}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "NatureWellness 47:12", text });
        return;
      } catch (err) {
        // A user cancelling the sheet raises AbortError — not worth a fallback.
        if ((err as Error)?.name === "AbortError") return;
        console.error("Native share failed, falling back to WhatsApp:", err);
      }
    }

    const opened = window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
    if (!opened) {
      // Popup blocked — put it on the clipboard so the tap still achieves something.
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard", {
          description: "Your browser blocked the share window, so we copied the text instead.",
        });
      } catch {
        toast.error("Could not open share", { description: "Please try again." });
      }
    }
  };

  const handleDownload = async () => {
    if (!data || recommendations.length === 0) {
      toast("Nothing to download yet", {
        description: "Wait for recommendations to finish loading, then try again.",
      });
      return;
    }
    setDownloading(true);
    try {
      await downloadRecommendationsPdf({ diseaseName: disease?.name ?? "Condition", data });
      toast.success("PDF downloaded", {
        description: "Your recommendations report has been saved.",
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Could not generate PDF", {
        description: (err as Error)?.message || "Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const stats = [
    { label: "Genes", value: data?.genes_found ?? genes.length, icon: Dna },
    { label: "Pathways", value: data?.pathways_found ?? pathways.length, icon: RouteIcon },
    { label: "Compounds", value: data?.compounds_found ?? 0, icon: FlaskConical },
    { label: "Foods", value: data?.foods_found ?? foods.length, icon: Activity },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background pb-16">
      <div className="container mx-auto px-4 py-6">
        {/* ============================ TOP BAR ============================ */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 h-9 w-9 shrink-0 rounded-full"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold capitalize text-secondary sm:text-3xl">
                {disease?.name ?? "Condition"}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Evidence Graded
                <span className="mx-1.5 text-border">|</span>
                {mode === "academic" ? "Academic Mode" : "Private Mode"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pl-12 lg:pl-0">
            {/* Action icons */}
            <div className="flex items-center gap-1">
              {[
                {
                  icon: saved ? BookmarkCheck : Bookmark,
                  label: saved ? "Remove from Favorites" : "Save",
                  onClick: handleToggleSave,
                  busy: false,
                  active: saved,
                },
                { icon: Share2, label: "Share", onClick: handleShare, busy: false, active: false },
                {
                  icon: downloading ? Loader2 : Download,
                  label: "Download",
                  onClick: handleDownload,
                  busy: downloading,
                  active: false,
                },
              ].map((a) => (
                <Button
                  key={a.label}
                  variant="outline"
                  size="icon"
                  className={`h-9 w-9 rounded-full border-border/70 ${
                    a.active ? "border-primary/40 bg-accent/15 text-primary" : ""
                  }`}
                  onClick={a.onClick}
                  disabled={a.busy}
                  aria-label={a.label}
                  aria-pressed={a.active}
                  title={a.label}
                >
                  <a.icon
                    className={`h-4 w-4 ${a.busy ? "animate-spin" : ""} ${
                      a.active ? "fill-primary/20" : ""
                    }`}
                  />
                </Button>
              ))}
            </div>

            {/* Mode toggle */}
            <div className="inline-flex rounded-full border border-border bg-card p-0.5">
              {(["academic", "private"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    mode === m
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "academic" ? "Academic Mode" : "Private Mode"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!disease && (
          <div className="py-20 text-center text-muted-foreground">
            <p>Condition not found.</p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Back to Search
            </Button>
          </div>
        )}

        {/* ============================ LOADING ============================ */}
        {disease && isLoading && <LoadingCard />}

        {/* ============================ ERROR ============================ */}
        {disease && isError && (
          <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold text-secondary">Something went wrong</p>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message || "An unexpected error occurred."}
            </p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        )}

        {/* ============================ CONTENT ============================ */}
        {disease && data && !isLoading && (
          <>
            {/* Compact stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-primary">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-lg font-bold leading-none text-foreground">{s.value}</span>
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </span>
                </div>
              ))}
            </div>

            {recommendations.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <p>No food recommendations found for this condition yet.</p>
              </div>
            ) : (
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="mb-6 flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-muted/70 p-1 no-scrollbar">
                  {TABS.map((t) => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      ref={t.value === "references" ? referencesTabRef : undefined}
                      className="shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* -------------------- SUMMARY -------------------- */}
                <TabsContent value="summary" className="animate-fade-in">
                  <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-8 lg:col-span-2">
                      {/* AI summary — hidden entirely when it cannot be produced */}
                      {(summaryLoading || summary) && !summaryFailed && (
                        <section
                          aria-labelledby="ai-summary-heading"
                          aria-busy={summaryLoading}
                          className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
                        >
                          <h3
                            id="ai-summary-heading"
                            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            AI Summary
                          </h3>

                          {summaryLoading ? (
                            <div className="mt-3 space-y-2" aria-hidden="true">
                              <div className="h-4 w-full animate-pulse rounded bg-muted" />
                              <div className="h-4 w-[92%] animate-pulse rounded bg-muted" />
                              <div className="h-4 w-[68%] animate-pulse rounded bg-muted" />
                            </div>
                          ) : (
                            <p className="mt-3 text-base leading-relaxed text-foreground/90">
                              {summary}
                            </p>
                          )}

                          <p className="mt-3 border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
                            Generated from the evidence below. Not medical advice.
                          </p>
                        </section>
                      )}

                      <p className="text-base leading-relaxed text-foreground/90">
                        Plant foods and their nutrients &amp; phytochemicals may support{" "}
                        <span className="font-semibold capitalize text-secondary">{disease.name}</span>{" "}
                        management through multiple genes and pathways.
                      </p>

                      {/* Top foods */}
                      <div>
                        <h3 className="mb-3 text-lg font-bold text-secondary">
                          Top Recommended Fruits &amp; Vegetables
                        </h3>
                        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar">
                          {foods.slice(0, 12).map((f) => {
                            const v = getFoodVisual(f.name);
                            const gm = GRADE_META[f.grade];
                            return (
                              <div
                                key={f.name}
                                className="w-40 shrink-0 rounded-2xl border border-border/70 bg-card p-4 text-center shadow-sm"
                              >
                                <FoodAvatar
                                  name={f.name}
                                  className="mx-auto h-16 w-16"
                                  emojiClassName="text-2xl"
                                />
                                <h4 className="mt-3 truncate text-sm font-semibold capitalize text-foreground">
                                  {f.name}
                                </h4>
                                <p className="truncate text-xs italic text-muted-foreground">
                                  {v.scientificName || f.phytochemical || " "}
                                </p>
                                <span
                                  className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${gm.badgeClass}`}
                                >
                                  {gm.cardLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Scientific basis — where the evidence comes from */}
                      <section
                        aria-labelledby="evidence-sources-heading"
                        className="rounded-2xl border border-primary/25 bg-accent/10 p-5"
                      >
                        <h3
                          id="evidence-sources-heading"
                          className="flex items-center gap-2 text-lg font-bold text-secondary"
                        >
                          <BookOpen className="h-5 w-5 shrink-0 text-primary" /> Evidence Sources
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                          {totalPublications > 0 ? (
                            <>
                              This analysis is based on{" "}
                              <span className="font-semibold text-foreground">
                                {totalPublications}
                              </span>{" "}
                              peer-reviewed publication
                              {totalPublications === 1 ? "" : "s"} from the following databases:
                            </>
                          ) : (
                            <>This analysis draws on the following scientific databases:</>
                          )}
                        </p>
                        {/* role="list" survives Tailwind's list-style reset, which
                            otherwise strips list semantics in some screen readers. */}
                        <ul role="list" className="mt-3 grid gap-2 sm:grid-cols-2">
                          {DATA_SOURCES.map((s) => (
                            <li
                              key={s}
                              className="flex items-start gap-2 text-sm leading-snug text-foreground/85"
                            >
                              <Database
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                                aria-hidden="true"
                              />
                              {s}
                            </li>
                          ))}
                        </ul>
                        {mode === "private" ? (
                          <p className="mt-4 text-xs text-muted-foreground">
                            Individual citations are hidden in Private Mode — switch to{" "}
                            <span className="font-medium text-primary">Academic Mode</span> to open
                            the reference list.
                          </p>
                        ) : (
                          <Button
                            variant="outline"
                            className="mt-4 gap-2 rounded-xl border-primary/30 bg-background text-primary hover:bg-accent/15"
                            onClick={goToReferences}
                          >
                            View All References{" "}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </section>

                      {/* Benefit areas */}
                      {benefits.length > 0 && (
                        <div>
                          <h3 className="mb-3 text-lg font-bold text-secondary">Key Benefit Areas</h3>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {benefits.map((b) => (
                              <div
                                key={b.label}
                                className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card p-4 text-center shadow-sm"
                              >
                                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-primary">
                                  <b.icon className="h-5 w-5" />
                                </span>
                                <span className="text-xs font-medium leading-tight text-foreground">
                                  {b.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Evidence summary */}
                    <div className="lg:col-span-1">
                      <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
                        <h3 className="text-base font-bold text-secondary">Evidence Summary</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {recommendations.length} recommendation{recommendations.length === 1 ? "" : "s"} graded
                        </p>
                        <div className="mt-5 space-y-4">
                          {distribution.map((row) => {
                            const gm = GRADE_META[row.key];
                            return (
                              <div key={row.key}>
                                <div className="mb-1.5 flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                                    <span className={`h-2.5 w-2.5 rounded-full ${gm.dotClass}`} />
                                    Grade {row.key} · {gm.chartLabel}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {row.count} · {row.percent}%
                                  </span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={`h-full rounded-full transition-all ${gm.barClass}`}
                                    style={{ width: `${row.percent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {totalPublications > 0 && (
                          <p className="mt-5 flex items-center gap-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
                            <BookOpen className="h-3.5 w-3.5" />
                            Based on{" "}
                            <span className="font-semibold text-foreground">{totalPublications}</span>{" "}
                            publication{totalPublications === 1 ? "" : "s"}
                          </p>
                        )}
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* -------------------- FOODS & NUTRIENTS -------------------- */}
                <TabsContent value="foods" className="animate-fade-in">
                  <div className="space-y-3">
                    {recommendations.map((rec, idx) => {
                      const gm = gradeMeta(rec.evidence_grade);
                      const key = `${rec.fruit_vegetable}-${idx}`;
                      const fav = favorites.has(key);
                      const pmids = pmidsFor(rec.sample_citations);
                      const evType = evidenceType(rec.interaction_type);
                      const source = dataSourceLabel(rec);
                      const sourcesId = `food-sources-${idx}`;
                      const sourcesOpen = openSources.has(key);
                      const pairLabel = [rec.phytochemical, rec.gene_target]
                        .filter(Boolean)
                        .join(" acting on ");
                      const sampleNote =
                        rec.publication_count > pmids.length
                          ? ` — showing ${pmids.length} of ${rec.publication_count}`
                          : "";
                      return (
                        <div
                          key={key}
                          className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                          <FoodAvatar
                            name={rec.fruit_vegetable}
                            className="h-20 w-20"
                            emojiClassName="text-2xl"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate font-semibold capitalize text-foreground">
                              {rec.fruit_vegetable}
                            </h4>
                            {rec.phytochemical && (
                              <p className="truncate text-sm text-muted-foreground">{rec.phytochemical}</p>
                            )}
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Recommended Quantity:{" "}
                              <span className="text-foreground/80">{servingQuantity(rec.fruit_vegetable)}</span>
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${gm.badgeClass}`}
                          >
                            {gm.cardLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(key)}
                            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                            aria-pressed={fav}
                            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary"
                          >
                            <Heart
                              className={`h-5 w-5 ${fav ? "fill-primary text-primary" : ""}`}
                            />
                          </button>
                          </div>

                          <div className="mt-3 space-y-2.5 border-t border-border/60 pt-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                              {pmids.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSources(key)}
                                  aria-expanded={sourcesOpen}
                                  aria-controls={sourcesId}
                                  aria-label={`${pmids.length} source${
                                    pmids.length === 1 ? "" : "s"
                                  } — ${sourcesOpen ? "hide" : "show"} PubMed references${
                                    pairLabel ? ` for ${pairLabel}` : ""
                                  }`}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-accent/20"
                                >
                                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                  {pmids.length} source{pmids.length === 1 ? "" : "s"}
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform ${
                                      sourcesOpen ? "rotate-180" : ""
                                    }`}
                                    aria-hidden="true"
                                  />
                                </button>
                              ) : (
                                <span className={CHIP_CLASS}>
                                  <FileText className="h-3 w-3" aria-hidden="true" />
                                  No linked PubMed records
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Source:{" "}
                                <span className="font-medium text-foreground/80">{source}</span>
                              </span>
                              {evType && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <span className="h-1 w-1 rounded-full bg-border" />
                                  {evType}
                                </span>
                              )}
                            </div>

                            {pmids.length > 0 && (
                              // Kept in the DOM while collapsed so `aria-controls`
                              // always resolves and in-page search still finds a PMID.
                              <div
                                id={sourcesId}
                                hidden={!sourcesOpen}
                                className="animate-fade-in rounded-xl bg-muted/50 p-3"
                              >
                                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                                  PubMed references{pairLabel ? ` for ${pairLabel}` : ""}
                                  {sampleNote}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {pmids.map((pmid) => (
                                    <a
                                      key={pmid}
                                      href={pubmedUrl(pmid)}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label={`PubMed: ${pmid}${
                                        pairLabel ? ` — ${pairLabel}` : ""
                                      } (opens in a new tab)`}
                                      title={`Open PMID ${pmid} on PubMed`}
                                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent/20"
                                    >
                                      PubMed: {pmid}
                                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* -------------------- GENES & PATHWAYS -------------------- */}
                <TabsContent value="genes" className="animate-fade-in">
                  <div className="space-y-8">
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-secondary">
                        <Dna className="h-5 w-5 text-primary" /> Key Genes
                      </h3>
                      {genes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {genes.map((g) => (
                            <span
                              key={g}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-accent/10 px-3 py-1.5 text-sm font-semibold text-primary"
                            >
                              <Dna className="h-3.5 w-3.5" />
                              {g}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No gene targets reported.</p>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-secondary">
                        <RouteIcon className="h-5 w-5 text-primary" /> Key Pathways
                      </h3>
                      {pathways.length > 0 ? (
                        <div className="space-y-2">
                          {pathways.map((p) => (
                            <div
                              key={p}
                              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-primary">
                                <RouteIcon className="h-4 w-4" />
                              </span>
                              <span className="text-sm font-medium text-foreground">{p}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No pathways reported.</p>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-accent/10"
                      onClick={() => comingSoon("Pathway diagram")}
                    >
                      <MapIcon className="h-4 w-4" /> View Pathway Diagram
                    </Button>
                  </div>
                </TabsContent>

                {/* -------------------- MECHANISMS -------------------- */}
                <TabsContent value="mechanisms" className="animate-fade-in">
                  <p className="mb-4 text-sm text-muted-foreground">
                    How these compounds may act on the genes linked to{" "}
                    <span className="capitalize text-foreground">{disease.name}</span>:
                  </p>
                  <ul className="space-y-2.5">
                    {mechanisms.map((m, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-primary">
                          <Activity className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground">{m.text}</span>
                          {m.sub && <span className="block text-xs text-muted-foreground">{m.sub}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="mt-5 gap-2 rounded-xl border-primary/30 text-primary hover:bg-accent/10"
                    onClick={() => comingSoon("Mechanism map")}
                  >
                    <Network className="h-4 w-4" /> View Full Mechanism Map
                  </Button>
                </TabsContent>

                {/* -------------------- SERVING & PREPARATION -------------------- */}
                <TabsContent value="serving" className="animate-fade-in">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {foods.slice(0, 5).map((f) => {
                      const info = servingInfo(f.name);
                      return (
                        <div
                          key={f.name}
                          className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <FoodAvatar
                              name={f.name}
                              className="h-12 w-12"
                              emojiClassName="text-xl"
                            />
                            <h4 className="font-semibold capitalize text-foreground">{f.name}</h4>
                          </div>
                          <dl className="space-y-2 text-sm">
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Best served
                              </dt>
                              <dd className="font-medium text-foreground">{info.serving}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Preparation effect
                              </dt>
                              <dd className="text-foreground/80">{info.effect}</dd>
                            </div>
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* -------------------- REFERENCES -------------------- */}
                <TabsContent value="references" className="animate-fade-in">
                  {mode === "private" ? (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-8 text-center">
                      <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 font-medium text-foreground">Literature hidden in Private Mode</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Switch to <span className="font-medium text-primary">Academic Mode</span> to view the{" "}
                        {citedPmidCount} supporting citation{citedPmidCount === 1 ? "" : "s"}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Masthead: what this evidence rests on */}
                      <section
                        aria-labelledby="references-heading"
                        className="rounded-2xl border border-primary/25 bg-accent/10 p-5"
                      >
                        <h3
                          id="references-heading"
                          className="flex items-center gap-2 text-lg font-bold text-secondary"
                        >
                          <BookOpen className="h-5 w-5 shrink-0 text-primary" /> Scientific References
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                          Based on{" "}
                          <span className="font-semibold text-foreground">{totalPublications}</span>{" "}
                          peer-reviewed publication{totalPublications === 1 ? "" : "s"}
                          {citedPmidCount > 0 && (
                            <>
                              , with{" "}
                              <span className="font-semibold text-foreground">{citedPmidCount}</span>{" "}
                              representative PubMed record{citedPmidCount === 1 ? "" : "s"} linked below
                            </>
                          )}
                          .
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Publications are counted once per compound–gene pair, not once per food.
                        </p>
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <Database className="h-3.5 w-3.5 shrink-0 text-primary" />
                          Data sources: {DATA_SOURCE_SUMMARY}
                        </p>
                        <p className="mt-3 border-t border-primary/15 pt-3 text-xs italic text-muted-foreground">
                          {PUBMED_HINT}
                        </p>
                      </section>

                      {referenceGroups.length > 0 ? (
                        <ol role="list" className="space-y-3">
                          {referenceGroups.map((g) => {
                            const gm = GRADE_META[g.grade];
                            const showing =
                              g.publicationCount > g.pmids.length
                                ? `showing ${g.pmids.length} of ${g.publicationCount}`
                                : "";
                            return (
                              <li
                                key={g.key}
                                className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h4 className="text-base font-bold leading-snug text-secondary">
                                      <span className="capitalize">{g.phytochemical}</span>
                                      <span className="mx-1.5 text-primary" aria-hidden="true">
                                        →
                                      </span>
                                      <span className="sr-only">acting on gene target</span>
                                      <span className="font-mono">{g.gene}</span>
                                    </h4>
                                    {g.foods.length > 0 && (
                                      <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                                        Found in: {g.foods.join(", ")}
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${gm.badgeClass}`}
                                  >
                                    {gm.fullLabel}
                                  </span>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/85">
                                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                                    {g.publicationCount} publication
                                    {g.publicationCount === 1 ? "" : "s"}
                                  </span>
                                  {g.interactionType && (
                                    <span>
                                      Interaction:{" "}
                                      <span className="text-foreground/80">{g.interactionType}</span>
                                    </span>
                                  )}
                                  {g.pathway && (
                                    <span>
                                      Pathway: <span className="text-foreground/80">{g.pathway}</span>
                                    </span>
                                  )}
                                </div>

                                <div className="mt-3 border-t border-border/60 pt-3">
                                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    PubMed citations{showing ? ` · ${showing}` : ""}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {g.pmids.map((pmid) => (
                                      <a
                                        key={pmid}
                                        href={pubmedUrl(pmid)}
                                        target="_blank"
                                        rel="noreferrer"
                                        // Opens with the visible text so the accessible
                                        // name still contains it (WCAG 2.5.3).
                                        aria-label={`PubMed: ${pmid} — ${g.phytochemical} acting on ${g.gene} (opens in a new tab)`}
                                        title={`Open PMID ${pmid} on PubMed`}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent/20"
                                      >
                                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                        PubMed: {pmid}
                                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                      </a>
                                    ))}
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                                  <span className={CHIP_CLASS}>
                                    <Database className="h-3 w-3 text-primary" aria-hidden="true" />
                                    Source: {g.source}
                                  </span>
                                  <span className={CHIP_CLASS}>{g.evidenceType}</span>
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      ) : (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                          No individual PubMed citations were returned for this condition yet.
                          The grades above still come from the databases listed.
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
