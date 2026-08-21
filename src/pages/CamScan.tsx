import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  Dna,
  ExternalLink,
  Flame,
  FlaskConical,
  Leaf,
  RefreshCw,
  Route as RouteIcon,
  Scale,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPlantHealthBenefits,
  identifyPlant,
  type HealthBenefitsResponse,
  type PlantIdentification,
} from "@/lib/api";
import {
  QUANTITY_NOTE,
  gradeMeta,
  healthSupportingText,
  heatSensitivity,
} from "@/lib/food-display";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PUBMED_BASE = "https://pubmed.ncbi.nlm.nih.gov";

/** Pull a numeric PMID out of a "PMID 12345678" citation string. */
const pmidFrom = (citation: string): string | undefined =>
  citation.match(/(\d{4,9})/)?.[1];

/** Read a File as a base64 data URI. */
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });

interface ConfidenceTier {
  ring: string;
  chip: string;
  label: string;
}

// Chips use the solid grade tokens (fill + paired -foreground) so the label
// keeps AA contrast — the tinted-text variant fails on the amber tier.
const confidenceTier = (confidence: number): ConfidenceTier => {
  if (confidence > 0.7)
    return {
      ring: "text-evidence-a",
      chip: "bg-evidence-a text-evidence-a-foreground border-transparent",
      label: "High confidence match",
    };
  if (confidence >= 0.4)
    return {
      ring: "text-evidence-b",
      chip: "bg-evidence-b text-evidence-b-foreground border-transparent",
      label: "Moderate confidence match",
    };
  return {
    ring: "text-evidence-c",
    chip: "bg-evidence-c text-evidence-c-foreground border-transparent",
    label: "Low confidence match",
  };
};

/**
 * True on devices that can realistically open a rear camera — phones and
 * tablets. Desktops get the upload path only, because `capture` there either
 * does nothing or drops the user into an unexpected webcam dialog.
 */
const detectCamera = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
};

const useHasCamera = (): boolean => {
  // Resolved synchronously on first render so the camera button never flashes in.
  const [hasCamera, setHasCamera] = useState(detectCamera);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const coarse = window.matchMedia("(pointer: coarse)");
    const sync = () => setHasCamera(coarse.matches || window.innerWidth < 768);
    sync();
    // Safari < 14 only has the deprecated addListener/removeListener pair;
    // without this fallback the effect throws and takes the page down.
    const supportsModernListener = typeof coarse.addEventListener === "function";
    if (supportsModernListener) coarse.addEventListener("change", sync);
    else coarse.addListener(sync);
    window.addEventListener("resize", sync);
    return () => {
      if (supportsModernListener) coarse.removeEventListener("change", sync);
      else coarse.removeListener(sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return hasCamera;
};

/** Circular confidence gauge — fills from zero once a result lands. */
const ConfidenceRing = ({ value }: { value: number }) => {
  const tier = confidenceTier(value);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const timer = window.setTimeout(() => setProgress(value), 80);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div
      className={`relative h-[76px] w-[76px] shrink-0 ${tier.ring}`}
      role="img"
      aria-label={`${Math.round(value * 100)}% identification confidence — ${tier.label}`}
    >
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          strokeWidth="6"
          className="stroke-border"
        />
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      {/* The numeral stays ink-coloured; only the arc carries the tier hue. */}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold leading-none tabular-nums text-foreground">
          {Math.round(value * 100)}%
        </span>
      </span>
    </div>
  );
};

/** Three green dots breathing in sequence while a request is in flight. */
const ScanningDots = ({ className = "" }: { className?: string }) => (
  <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="h-1.5 w-1.5 animate-scan-dot rounded-full bg-current"
        style={{ animationDelay: `${i * 160}ms` }}
      />
    ))}
  </span>
);

const CORNERS = [
  { key: "tl", position: "left-3 top-3 rounded-tl-xl border-l-[3px] border-t-[3px]" },
  { key: "tr", position: "right-3 top-3 rounded-tr-xl border-r-[3px] border-t-[3px]" },
  { key: "bl", position: "bottom-3 left-3 rounded-bl-xl border-b-[3px] border-l-[3px]" },
  { key: "br", position: "bottom-3 right-3 rounded-br-xl border-b-[3px] border-r-[3px]" },
];

/** Camera-style frame: green corner brackets, plus a sweep bar while scanning. */
const Viewfinder = ({
  scanning,
  children,
}: {
  scanning: boolean;
  children: ReactNode;
}) => (
  <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-muted">
    {children}
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {CORNERS.map((corner) => (
        <span
          key={corner.key}
          className={`absolute h-9 w-9 border-primary ${corner.position} ${
            scanning ? "animate-viewfinder" : "opacity-70"
          }`}
        />
      ))}
      {scanning && (
        <span className="absolute inset-x-0 top-0 h-16 animate-scan-sweep bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
      )}
    </span>
  </div>
);

/** One labelled data point in an association card's footer strip. */
const MetaItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2">
    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-xs leading-snug text-foreground/85">{value}</dd>
    </div>
  </div>
);

const CamScan = () => {
  const navigate = useNavigate();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const hasCamera = useHasCamera();

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [identification, setIdentification] = useState<PlantIdentification | null>(null);

  const [loadingBenefits, setLoadingBenefits] = useState(false);
  const [benefitsFailed, setBenefitsFailed] = useState(false);
  const [benefits, setBenefits] = useState<HealthBenefitsResponse | null>(null);

  const resetAll = () => {
    setImageDataUrl(null);
    setIdentification(null);
    setBenefits(null);
    setBenefitsFailed(false);
    setIdentifying(false);
    setLoadingBenefits(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Fresh selection clears any previous result.
    setIdentification(null);
    setBenefits(null);
    setBenefitsFailed(false);
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
    } catch (err) {
      toast.error("Could not load image", { description: (err as Error)?.message });
    }
  };

  const loadBenefits = async (source: PlantIdentification) => {
    if (!source.plant_name) return;
    setLoadingBenefits(true);
    setBenefits(null);
    setBenefitsFailed(false);
    try {
      const result = await getPlantHealthBenefits(
        source.plant_name,
        source.scientific_name || "",
      );
      setBenefits(result);
    } catch (err) {
      setBenefitsFailed(true);
      toast.error("Could not load health associations", {
        description: (err as Error)?.message || "Please try again.",
      });
    } finally {
      setLoadingBenefits(false);
    }
  };

  const handleIdentify = async () => {
    if (!imageDataUrl) return;
    setIdentifying(true);
    setIdentification(null);
    setBenefits(null);
    setBenefitsFailed(false);

    let result: PlantIdentification | null = null;
    try {
      result = await identifyPlant(imageDataUrl);
      setIdentification(result);
      if (result.is_plant === false) {
        toast("That doesn't look like a plant", {
          description: "Try a clearer photo of a leaf, flower, fruit, or vegetable.",
        });
      }
    } catch (err) {
      toast.error("Identification failed", {
        description: (err as Error)?.message || "Please try again.",
      });
    } finally {
      setIdentifying(false);
    }

    // The button promises benefits, so the associations load in the same tap.
    if (result && result.is_plant !== false && result.plant_name) {
      await loadBenefits(result);
    }
  };

  const isPlant = identification?.is_plant !== false;
  const confidence = identification?.confidence ?? 0;
  const busy = identifying || loadingBenefits;

  const phytochemicals = benefits?.phytochemicals ?? [];
  const phytochemicalLabel = phytochemicals.length
    ? phytochemicals.slice(0, 3).join(", ") +
      (phytochemicals.length > 3 ? ` +${phytochemicals.length - 3} more` : "")
    : null;
  const heatNote = heatSensitivity(
    benefits?.plant_name || identification?.plant_name || "",
  );

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background pb-16">
      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-accent/25 via-accent/10 to-background">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 70% at 50% 0%, hsl(var(--primary) / 0.14), transparent 70%)",
          }}
        />
        <div className="container relative mx-auto max-w-3xl px-4 pb-10 pt-10 text-center sm:pb-12 sm:pt-14">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-card text-primary shadow-sm">
            <ScanLine className="h-8 w-8" />
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-secondary sm:text-4xl">
            Scan a Plant
          </h1>
          {/* foreground/75, not muted-foreground: the green wash drops the
              muted token to ~4.4:1 here, under the AA floor for 16px copy. */}
          <p className="mx-auto mt-2 max-w-xl text-base leading-relaxed text-foreground/75">
            Scan or upload a photo to identify a plant, fruit, or vegetable and explore
            its evidence-based health associations.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* ==================== SECTION 1 — SCAN INPUT ==================== */}
        <Card className="rounded-3xl border-border/70 p-6 shadow-sm sm:p-8">
          {/* Mobile camera: `capture` asks the OS for the rear lens directly. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          {/* Gallery / desktop file picker: deliberately no `capture` attribute. */}
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {!imageDataUrl ? (
            <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-accent/5 px-6 py-10 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ScanLine className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-secondary">Start a scan</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasCamera
                  ? "Take a photo now, or pick one from your gallery."
                  : "Choose a photo of a plant, fruit, or vegetable."}
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
                {hasCamera && (
                  <Button
                    onClick={() => cameraInputRef.current?.click()}
                    className="h-12 rounded-2xl bg-primary px-6 text-base font-semibold hover:bg-primary/90"
                  >
                    <span aria-hidden="true">📷</span> Take Photo
                  </Button>
                )}
                <Button
                  variant={hasCamera ? "outline" : "default"}
                  onClick={() => uploadInputRef.current?.click()}
                  className={
                    hasCamera
                      ? "h-12 rounded-2xl border-primary/30 px-6 text-base font-semibold text-primary hover:bg-accent/10"
                      : "h-12 rounded-2xl bg-primary px-6 text-base font-semibold hover:bg-primary/90"
                  }
                >
                  <span aria-hidden="true">🖼️</span> Upload Image
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Viewfinder scanning={identifying}>
                <img
                  src={imageDataUrl}
                  alt="Selected plant"
                  className="max-h-80 w-full bg-muted object-contain"
                />
                {identifying && (
                  <span
                    role="status"
                    className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-secondary/85 py-2.5 text-sm font-semibold text-secondary-foreground"
                  >
                    <ScanningDots className="text-accent" /> Scanning…
                  </span>
                )}
              </Viewfinder>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={handleIdentify}
                  disabled={busy}
                  className="h-auto min-h-12 flex-1 whitespace-normal rounded-2xl bg-primary px-5 py-3 text-base font-semibold leading-snug hover:bg-primary/90"
                >
                  {identifying ? (
                    <>
                      <ScanningDots className="mr-1" /> Identifying…
                    </>
                  ) : (
                    <>
                      <Leaf className="h-5 w-5 shrink-0" /> Identify Health &amp; Wellness
                      Benefits
                    </>
                  )}
                </Button>
                {hasCamera && (
                  <Button
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={busy}
                    className="h-12 rounded-2xl border-primary/30 text-primary hover:bg-accent/10"
                  >
                    <span aria-hidden="true">📷</span> Take Photo
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={busy}
                  className="h-12 rounded-2xl border-primary/30 text-primary hover:bg-accent/10"
                >
                  <RefreshCw className="h-4 w-4" /> Change Photo
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ==================== NOT A PLANT ==================== */}
        {identification && !isPlant && (
          <Card className="animate-slide-up mt-6 rounded-3xl border-destructive/30 bg-destructive/5 p-6 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
            <h2 className="mt-3 text-lg font-semibold text-secondary">
              We couldn't find a plant in that photo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a clearer, well-lit photo of a single leaf, flower, fruit, or vegetable.
            </p>
            <Button className="mt-4 rounded-2xl" onClick={resetAll}>
              <ScanLine className="h-4 w-4" /> Try Again
            </Button>
          </Card>
        )}

        {/* ==================== IDENTIFICATION RESULT ==================== */}
        {identification && isPlant && (
          <Card className="animate-slide-up mt-6 rounded-3xl border-border/70 p-6 shadow-sm sm:p-8">
            {identification.low_confidence && (
              <div className="mb-5 flex items-start gap-2 rounded-2xl border border-evidence-c/30 bg-evidence-c/10 p-3 text-sm text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-evidence-c" />
                <span>
                  This is a low-confidence match — the result may not be accurate. Consider
                  retaking the photo in better light.
                </span>
              </div>
            )}
            <div className="flex flex-col gap-5 sm:flex-row">
              {identification.plant_image_url && (
                <img
                  src={identification.plant_image_url}
                  alt={identification.plant_name || "Identified plant"}
                  className="h-32 w-32 shrink-0 self-center rounded-2xl border border-border/70 object-cover sm:self-start"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h2
                      key={identification.plant_name}
                      className="animate-reveal text-2xl font-bold text-secondary sm:text-3xl"
                    >
                      {identification.plant_name}
                    </h2>
                    {identification.scientific_name && (
                      <p className="mt-1 text-sm italic text-muted-foreground">
                        {identification.scientific_name}
                      </p>
                    )}
                    {confidence > 0 && (
                      <span
                        className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${confidenceTier(confidence).chip}`}
                      >
                        {confidenceTier(confidence).label}
                      </span>
                    )}
                  </div>
                  {confidence > 0 && <ConfidenceRing value={confidence} />}
                </div>

                {identification.common_names && identification.common_names.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {identification.common_names.map((name) => (
                      <span
                        key={name}
                        className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground/80"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}

                {loadingBenefits && (
                  <p
                    role="status"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    <ScanningDots /> Gathering evidence-based health associations…
                  </p>
                )}

                {benefitsFailed && !loadingBenefits && (
                  <Button
                    onClick={() => loadBenefits(identification)}
                    className="mt-5 h-11 rounded-2xl bg-primary text-base font-semibold hover:bg-primary/90"
                  >
                    <RefreshCw className="h-4 w-4" /> Retry Health Associations
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* ==================== HEALTH ASSOCIATIONS ==================== */}
        {benefits && benefits.status === "no_data" && (
          <Card className="animate-slide-up mt-6 rounded-3xl border-border/70 bg-muted/30 p-6 text-center shadow-sm">
            <Leaf className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">
              {benefits.message ||
                `We identified ${benefits.plant_name} but don't have phytochemical data for it yet.`}
            </p>
          </Card>
        )}

        {benefits && benefits.status !== "no_data" && (
          <div className="animate-slide-up mt-6 space-y-6">
            {/* Phytochemicals */}
            {benefits.phytochemicals.length > 0 && (
              <Card className="rounded-3xl border-border/70 p-6 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-secondary">
                  <Sparkles className="h-5 w-5 shrink-0 text-primary" /> Phytochemicals
                  Found
                </h3>
                <div className="flex flex-wrap gap-2">
                  {benefits.phytochemicals.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-accent/10 px-3 py-1.5 text-sm font-semibold text-primary"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Evidence-Based Health Associations */}
            {benefits.health_associations.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-secondary">
                  <Dna className="h-5 w-5 shrink-0 text-primary" /> Evidence-Based Health
                  Associations
                </h3>
                <div className="space-y-3">
                  {benefits.health_associations.map((a, idx) => {
                    const gm = gradeMeta(a.evidence_grade);
                    const pmids = a.sample_citations
                      .map(pmidFrom)
                      .filter((p): p is string => Boolean(p));
                    const supportingFunction = healthSupportingText(
                      a.potential_health_benefit,
                    );
                    return (
                      <div
                        key={`${a.gene}-${idx}`}
                        className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-primary">
                            <Dna className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-foreground">{a.gene}</h4>
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${gm.badgeClass}`}
                              >
                                {gm.fullLabel}
                              </span>
                            </div>
                            {a.pathway && (
                              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                <RouteIcon className="h-3.5 w-3.5 shrink-0" />{" "}
                                {healthSupportingText(a.pathway)}
                              </p>
                            )}
                            {a.interaction_type && (
                              <p className="text-xs capitalize text-muted-foreground">
                                {healthSupportingText(a.interaction_type)}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-right">
                            <span className="block text-lg font-bold leading-none text-foreground">
                              {a.publication_count}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              publication{a.publication_count === 1 ? "" : "s"}
                            </span>
                          </span>
                        </div>

                        {supportingFunction && (
                          <p className="mt-3 border-t border-border/60 pt-3 text-sm leading-relaxed text-foreground/90">
                            <span className="font-semibold text-secondary">
                              Potential Health-Supporting Function:{" "}
                            </span>
                            {supportingFunction}
                          </p>
                        )}

                        <dl className="mt-3 grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-3">
                          {phytochemicalLabel && (
                            <MetaItem
                              icon={FlaskConical}
                              label="Phytochemical / nutrient"
                              value={phytochemicalLabel}
                            />
                          )}
                          <MetaItem icon={Scale} label="Quantity" value={QUANTITY_NOTE} />
                          <MetaItem
                            icon={Flame}
                            label="Heat sensitivity"
                            value={heatNote}
                          />
                        </dl>

                        {pmids.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <BookOpen className="h-3.5 w-3.5" /> Sources:
                            </span>
                            {pmids.map((pmid) => (
                              <a
                                key={pmid}
                                href={`${PUBMED_BASE}/${pmid}/`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent/20"
                              >
                                PMID {pmid}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conditions these phytochemicals interact with */}
            {benefits.conditions_supported.length > 0 && (
              <Card className="rounded-3xl border-border/70 p-6 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-secondary">
                  <Leaf className="h-5 w-5 shrink-0 text-primary" /> Health Conditions
                  These Phytochemicals Interact With
                </h3>
                <div className="flex flex-wrap gap-2">
                  {benefits.conditions_supported.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => navigate(`/conditions?q=${encodeURIComponent(c)}`)}
                      className="rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-accent/15 hover:text-primary"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Footer summary + full evidence */}
            <Card className="rounded-3xl border-border/70 bg-muted/30 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  Based on{" "}
                  <span className="font-semibold text-foreground">
                    {benefits.total_publications}
                  </span>{" "}
                  publication{benefits.total_publications === 1 ? "" : "s"} from academic
                  literature
                </p>
                {benefits.conditions_supported.length > 0 && (
                  <Button
                    variant="outline"
                    className="rounded-2xl border-primary/30 text-primary hover:bg-accent/10"
                    onClick={() =>
                      navigate(
                        `/conditions?q=${encodeURIComponent(benefits.conditions_supported[0])}`,
                      )
                    }
                  >
                    View Full Evidence <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CamScan;
