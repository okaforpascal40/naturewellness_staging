import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Database,
  Dna,
  ExternalLink,
  FlaskConical,
  Leaf,
  SearchX,
} from "lucide-react";
import { ApiError, searchPlant, type PlantConditionEvidence } from "@/lib/api";
import { GRADE_META, gradeMeta, normalizeGrade, type GradeKey } from "@/lib/food-display";
import { DATA_SOURCES, PUBMED_HINT, pmidsFor, pubmedUrl } from "@/lib/citations";
import FoodAvatar from "@/components/FoodAvatar";
import PremiumLoader from "@/components/PremiumLoader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Loader narration for a plant lookup, which walks the pipeline in reverse. */
const PLANT_LOADER_MESSAGES = [
  "🌿 Looking up the plant's phytochemicals...",
  "🧬 Finding the genes they act on...",
  "🔬 Linking genes to health conditions...",
  "📊 Grading scientific evidence...",
  "📚 Retrieving PubMed references...",
] as const;

/** Both mean "nothing to show for this name", so neither is worth retrying. */
const isNotFound = (err: unknown): boolean =>
  err instanceof ApiError && (err.status === 404 || err.status === 422);

/**
 * Results page for a condition, or null when the id isn't one the
 * Recommendations route can resolve (it accepts Open Targets ids such as
 * "EFO_0000685"; the colon form some sources use is normalised to that).
 */
const conditionHref = (c: PlantConditionEvidence): string | null => {
  const id = c.condition_id?.trim().replace(":", "_");
  if (!id || !/^[A-Za-z]+_[0-9]+$/.test(id)) return null;
  return `/conditions/${id}?name=${encodeURIComponent(c.condition_name)}`;
};

const CHIP_CLASS =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium";

const PlantResults = () => {
  const { plantName = "" } = useParams<{ plantName: string }>();
  const navigate = useNavigate();
  const name = plantName.trim();

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["plant-search", name.toLowerCase()],
    queryFn: ({ signal }) => searchPlant(name, signal),
    enabled: name.length > 0,
    retry: (failures, err) => !isNotFound(err) && failures < 1,
    staleTime: 5 * 60 * 1000,
  });

  const conditions = useMemo(() => data?.conditions_with_evidence ?? [], [data]);

  // Grade spread across the conditions shown, strongest first.
  const distribution = useMemo(() => {
    const counts: Record<GradeKey, number> = { A: 0, B: 0, C: 0, None: 0 };
    for (const c of conditions) counts[normalizeGrade(c.evidence_grade)]++;
    const total = conditions.length || 1;
    return (["A", "B", "C"] as const).map((key) => ({
      key,
      count: counts[key],
      percent: Math.round((counts[key] / total) * 100),
    }));
  }, [conditions]);

  const notFound = !data && isError && isNotFound(error);

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background pb-16">
      <div className="container mx-auto px-4 py-6">
        <PremiumLoader visible={isFetching && !data} messages={PLANT_LOADER_MESSAGES} />

        {/* ============================ NOT FOUND ============================ */}
        {(notFound || !name) && !isFetching && (
          <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
            <SearchX className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-secondary">
              We couldn't find <span className="capitalize">{name || "that plant"}</span> in our
              database
            </h1>
            <p className="text-sm text-muted-foreground">
              Check the spelling, or try a common name such as “Turmeric” or “Blueberry”.
            </p>
            <Button onClick={() => navigate("/")}>Back to Search</Button>
          </div>
        )}

        {/* ============================ ERROR ============================ */}
        {isError && !notFound && !isFetching && !data && (
          <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
            <p className="text-lg font-semibold text-secondary">Something went wrong</p>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message || "An unexpected error occurred."}
            </p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        )}

        {/* ============================ CONTENT ============================ */}
        {data && (
          <>
            {/* -------------------- Plant header -------------------- */}
            <div className="mb-6 flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="mt-0.5 h-9 w-9 shrink-0 rounded-full"
                onClick={() => navigate(-1)}
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <FoodAvatar
                name={data.plant_name}
                className="h-16 w-16 sm:h-20 sm:w-20"
                emojiClassName="text-3xl sm:text-4xl"
                rounded="rounded-2xl"
              />
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold capitalize text-secondary sm:text-3xl">
                  {data.plant_name}
                </h1>
                {data.scientific_name && (
                  <p className="mt-0.5 text-sm italic text-muted-foreground sm:text-base">
                    {data.scientific_name}
                  </p>
                )}
              </div>
            </div>

            {data.phytochemicals.length > 0 && (
              <section aria-labelledby="phytochemicals-heading" className="mb-4">
                <h2
                  id="phytochemicals-heading"
                  className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <FlaskConical className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Key Phytochemicals
                </h2>
                <ul role="list" className="flex flex-wrap gap-2">
                  {data.phytochemicals.map((p) => (
                    <li key={p} className={`${CHIP_CLASS} border-primary/25 bg-accent/15 text-primary`}>
                      {p}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.nutrient_content && (
              <p className="mb-6 flex items-start gap-2 rounded-2xl border border-primary/20 bg-accent/10 px-4 py-3 text-sm leading-relaxed text-foreground/90">
                <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{data.nutrient_content}</span>
              </p>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              {/* -------------------- Conditions -------------------- */}
              <section aria-labelledby="conditions-heading" className="space-y-3 lg:col-span-2">
                <h2 id="conditions-heading" className="text-lg font-bold text-secondary">
                  Health Conditions This Plant Interacts With
                </h2>

                {conditions.length === 0 ? (
                  <p className="rounded-2xl border border-border/70 bg-card p-6 text-center text-sm text-muted-foreground">
                    No condition evidence is recorded for this plant yet.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">{PUBMED_HINT}</p>
                    {conditions.map((c) => (
                      <ConditionCard key={`${c.condition_id ?? ""}-${c.condition_name}`} condition={c} />
                    ))}
                  </>
                )}
              </section>

              {/* -------------------- Evidence summary -------------------- */}
              <div className="lg:col-span-1">
                <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
                  <h2 className="text-base font-bold text-secondary">Evidence Summary</h2>

                  <dl className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      { label: "Conditions", value: data.total_conditions },
                      { label: "Publications", value: data.total_publications },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-muted/50 px-3 py-2.5">
                        <dt className="text-xs text-muted-foreground">{s.label}</dt>
                        <dd className="text-xl font-bold leading-tight text-foreground">
                          {s.value.toLocaleString()}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {conditions.length > 0 && (
                    <div className="mt-5">
                      <h3 className="text-xs font-semibold text-foreground">Evidence grades</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Across the {conditions.length} condition{conditions.length === 1 ? "" : "s"} shown
                      </p>
                      <ul role="list" className="mt-3 space-y-3">
                        {distribution.map((row) => {
                          const gm = GRADE_META[row.key];
                          return (
                            <li key={row.key}>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 font-medium text-foreground">
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full ${gm.dotClass}`}
                                    aria-hidden="true"
                                  />
                                  Grade {row.key} · {gm.chartLabel}
                                </span>
                                <span className="text-muted-foreground">
                                  {row.count} · {row.percent}%
                                </span>
                              </div>
                              <div
                                className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                                aria-hidden="true"
                              >
                                <div
                                  className={`h-full rounded-full transition-all ${gm.barClass}`}
                                  style={{ width: `${row.percent}%` }}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <div className="mt-5 border-t border-border pt-4">
                    <h3 className="text-xs font-semibold text-foreground">Data sources</h3>
                    <ul role="list" className="mt-2 space-y-1.5">
                      {DATA_SOURCES.map((s) => (
                        <li
                          key={s}
                          className="flex items-start gap-2 text-xs leading-snug text-foreground/85"
                        >
                          <Database
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ConditionCard = ({ condition: c }: { condition: PlantConditionEvidence }) => {
  const href = conditionHref(c);
  const gm = gradeMeta(c.evidence_grade);
  const pmids = pmidsFor(c.sample_citations);

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words text-base font-semibold capitalize text-foreground">
          {href ? (
            <Link to={href} className="hover:text-primary hover:underline">
              {c.condition_name}
            </Link>
          ) : (
            c.condition_name
          )}
        </h3>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${gm.badgeClass}`}
          title={gm.fullLabel}
        >
          {gm.key === "None" ? gm.chartLabel : `Grade ${gm.key}`}
        </span>
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          {c.publication_count.toLocaleString()} publication{c.publication_count === 1 ? "" : "s"}
        </span>
        {c.interaction_type && <span className="capitalize">{c.interaction_type}</span>}
      </p>

      {c.gene_targets.length > 0 && (
        <div className="mt-3">
          <span className="sr-only">Gene targets:</span>
          <ul role="list" className="flex flex-wrap gap-1.5">
            {c.gene_targets.map((g) => (
              <li
                key={g}
                className={`${CHIP_CLASS} gap-1 border-border bg-muted/50 font-mono text-[11px] text-foreground/80`}
              >
                <Dna className="h-3 w-3 text-primary" aria-hidden="true" />
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pmids.length > 0 && (
        <ul role="list" className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {pmids.map((pmid) => (
            <li key={pmid}>
              <a
                href={pubmedUrl(pmid)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                PMID {pmid}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">(opens PubMed in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {href && (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-4 gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-accent/15"
        >
          <Link to={href}>
            Explore this condition
            <span className="sr-only">: {c.condition_name}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      )}
    </article>
  );
};

export default PlantResults;
