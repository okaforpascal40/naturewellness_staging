import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  Database,
  Dna,
  ExternalLink,
  FileText,
  Flame,
  FlaskConical,
  Leaf,
  RefreshCw,
  Route as RouteIcon,
  Scale,
  ScanLine,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPlantHealthBenefits,
  identifyPlant,
  type HealthBenefitsResponse,
  type PlantIdentification,
} from "@/lib/api";
import {
  CTD_DATABASE,
  DATA_SOURCE_SUMMARY,
  PUBMED_HINT,
  pmidsFor,
  pubmedSearchUrl,
  pubmedUrl,
  referenceEvidenceType,
} from "@/lib/citations";
import {
  QUANTITY_NOTE,
  gradeMeta,
  healthSupportingText,
  heatSensitivity,
} from "@/lib/food-display";
import PlantHealthPanel from "@/components/PlantHealthPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RESULT_TABS = [
  { value: "plant", label: "Plant Info", icon: Leaf },
  { value: "health", label: "Plant Health", icon: Stethoscope },
  { value: "benefits", label: "Health Benefits", icon: Sparkles },
  { value: "references", label: "References", icon: BookOpen },
];

/** Shared chip styling for source / evidence-type labels on association cards. */
const CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground/75";

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
  const [resultTab, setResultTab] = useState("plant");

  const resetAll = () => {
    setImageDataUrl(null);
    setIdentification(null);
    setResultTab("plant");
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
      // Any named match counts — fruits, tubers, seeds and dried foods often
      // come back with a weak is_plant signal but a perfectly good species.
      if (!result.plant_name) {
        toast("We could not identify this plant or food item", {
          description: "Try a clearer photo or search by name instead.",
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
    if (result?.plant_name) {
      await loadBenefits(result);
    }
  };

  // A scan that found something wrong should open on the diagnosis rather than
  // making the user go looking for it.
  useEffect(() => {
    if (!identification) return;
    const unhealthy =
      identification.health_assessment_available === true &&
      (identification.is_healthy === false ||
        (identification.plant_conditions ?? []).some((c) => c.is_harmful !== false));
    setResultTab(unhealthy ? "health" : "plant");
  }, [identification]);

  const isPlant = Boolean(identification?.plant_name);
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
            Scan or upload a photo to identify a plant, fruit, vegetable, tuber, seed, or
            herb and explore
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
              We could not identify this plant or food item
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a clearer photo or search by name instead.
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

        {/* ==================== RESULT TABS ==================== */}
        {identification && isPlant && (
          <Tabs value={resultTab} onValueChange={setResultTab} className="mt-6 w-full">
            <TabsList className="mb-5 flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-muted/70 p-1 no-scrollbar">
              {RESULT_TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <t.icon className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* -------------------- PLANT INFO -------------------- */}
            <TabsContent value="plant" className="animate-fade-in">
              <Card className="rounded-3xl border-border/70 p-6 shadow-sm">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Scientific name
                    </dt>
                    <dd className="mt-1 text-sm italic text-foreground">
                      {identification.scientific_name || "Not reported"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Identification confidence
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {confidence > 0
                        ? `${Math.round(confidence * 100)}% — ${confidenceTier(confidence).label}`
                        : "Not reported"}
                    </dd>
                  </div>
                </dl>

                {identification.common_names && identification.common_names.length > 0 && (
                  <div className="mt-5 border-t border-border/60 pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Also known as
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {identification.common_names.map((name) => (
                        <span
                          key={name}
                          className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground/80"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* -------------------- PLANT HEALTH -------------------- */}
            <TabsContent value="health" className="animate-fade-in">
              <PlantHealthPanel
                isHealthy={identification.is_healthy !== false}
                healthProbability={identification.health_probability}
                conditions={identification.plant_conditions ?? []}
                available={identification.health_assessment_available === true}
              />
            </TabsContent>

            {/* -------------------- HEALTH BENEFITS -------------------- */}
            <TabsContent value="benefits" className="animate-fade-in">
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
                    const pmids = pmidsFor(a.sample_citations);
                    const supportingFunction = healthSupportingText(
                      a.potential_health_benefit,
                    );
                    // The API pools every phytochemical's PMIDs per gene, so no
                    // single compound can be named as this gene's partner —
                    // attribute the citations to the plant, which is what the
                    // evidence actually says, and search PubMed for the same thing.
                    const plantLabel = benefits.plant_name || "this plant";
                    const primarySourceUrl =
                      pmids.length > 0
                        ? pubmedUrl(pmids[0])
                        : pubmedSearchUrl([plantLabel, a.gene]);
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

                        {/* Scientific sources — always shown, always reachable */}
                        <div className="mt-3 border-t border-border/60 pt-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <BookOpen className="h-3.5 w-3.5 text-primary" /> Scientific
                              sources
                            </p>
                            <a
                              href={primarySourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              // Opens with the visible text so the accessible name
                              // still contains it (WCAG 2.5.3).
                              aria-label={`View Source for ${a.gene} on PubMed (opens in a new tab)`}
                              title={`Open the PubMed evidence for ${a.gene}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent/20"
                            >
                              View Source
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          </div>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            PubMed citations linking{" "}
                            <span className="capitalize">{plantLabel}</span>&rsquo;s phytochemicals
                            to <span className="font-medium text-foreground/80">{a.gene}</span>
                          </p>

                          {pmids.length > 0 ? (
                            <>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {pmids.map((pmid) => (
                                  <a
                                    key={pmid}
                                    href={pubmedUrl(pmid)}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`PubMed: ${pmid} — ${a.gene} evidence (opens in a new tab)`}
                                    title={`Open PMID ${pmid} on PubMed`}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent/20"
                                  >
                                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                    PubMed: {pmid}
                                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                  </a>
                                ))}
                              </div>
                              <p className="mt-2 text-[11px] italic text-muted-foreground">
                                {PUBMED_HINT}
                              </p>
                            </>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">
                              No individual PMIDs were returned for this gene — use{" "}
                              <span className="font-medium text-foreground/80">View Source</span>{" "}
                              to search PubMed directly.
                            </p>
                          )}

                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <span className={CHIP_CLASS}>
                              <Database className="h-3 w-3 text-primary" aria-hidden="true" />
                              Source: {CTD_DATABASE}
                            </span>
                            <span className={CHIP_CLASS}>
                              {referenceEvidenceType(a.interaction_type)}
                            </span>
                          </div>
                        </div>
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
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    Based on{" "}
                    <span className="font-semibold text-foreground">
                      {benefits.total_publications}
                    </span>{" "}
                    peer-reviewed publication
                    {benefits.total_publications === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Database className="h-3.5 w-3.5 shrink-0 text-primary" />
                    Data sources: {DATA_SOURCE_SUMMARY}
                  </p>
                </div>
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
            </TabsContent>

            {/* -------------------- REFERENCES -------------------- */}
            <TabsContent value="references" className="animate-fade-in">
              <div className="space-y-4">
                <section className="rounded-2xl border border-primary/25 bg-accent/10 p-5">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-secondary">
                    <BookOpen className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    Scientific References
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                    {benefits
                      ? `Based on ${benefits.total_publications} peer-reviewed publication${
                          benefits.total_publications === 1 ? "" : "s"
                        }.`
                      : "Health associations are still loading."}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Database className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    Data sources: {DATA_SOURCE_SUMMARY}
                  </p>
                  <p className="mt-3 border-t border-primary/15 pt-3 text-xs italic text-muted-foreground">
                    {PUBMED_HINT}
                  </p>
                </section>

                {benefits && benefits.health_associations.length > 0 ? (
                  <ol role="list" className="space-y-3">
                    {benefits.health_associations.map((a, idx) => {
                      const pmids = pmidsFor(a.sample_citations);
                      if (pmids.length === 0) return null;
                      return (
                        <li
                          key={`ref-${a.gene}-${idx}`}
                          className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="font-mono text-sm font-bold text-secondary">{a.gene}</h4>
                            <span className={CHIP_CLASS}>
                              {a.publication_count} publication
                              {a.publication_count === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {pmids.map((pmid) => (
                              <a
                                key={pmid}
                                href={pubmedUrl(pmid)}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`PubMed: ${pmid} — ${a.gene} evidence (opens in a new tab)`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent/20"
                              >
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                PubMed: {pmid}
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                            <span className={CHIP_CLASS}>
                              <Database className="h-3 w-3 text-primary" aria-hidden="true" />
                              Source: {CTD_DATABASE}
                            </span>
                            <span className={CHIP_CLASS}>
                              {referenceEvidenceType(a.interaction_type)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No individual PubMed citations were returned for this plant yet.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* ==================== SCAN AGAIN ==================== */}
        {identification && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              onClick={resetAll}
              className="h-12 gap-2 rounded-2xl border-primary/30 px-6 text-base font-semibold text-primary hover:bg-accent/10"
            >
              <ScanLine className="h-4 w-4" aria-hidden="true" /> Scan Another Plant
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CamScan;
