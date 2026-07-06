import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  Camera,
  Dna,
  ExternalLink,
  Leaf,
  Loader2,
  RefreshCw,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPlantHealthBenefits,
  identifyPlant,
  type HealthBenefitsResponse,
  type PlantIdentification,
} from "@/lib/api";
import { gradeMeta } from "@/lib/food-display";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DISCLAIMER_TEXT } from "@/components/MedicalDisclaimer";

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

const confidenceBadge = (confidence: number) => {
  const pct = Math.round(confidence * 100);
  if (confidence > 0.7)
    return { label: `${pct}% confident`, className: "bg-evidence-a/15 text-evidence-a border-evidence-a/30" };
  if (confidence >= 0.4)
    return { label: `${pct}% confident`, className: "bg-evidence-b/15 text-evidence-b border-evidence-b/30" };
  return { label: `${pct}% confident`, className: "bg-evidence-c/15 text-evidence-c border-evidence-c/30" };
};

const CamScan = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [identification, setIdentification] = useState<PlantIdentification | null>(null);

  const [loadingBenefits, setLoadingBenefits] = useState(false);
  const [benefits, setBenefits] = useState<HealthBenefitsResponse | null>(null);

  const resetAll = () => {
    setImageDataUrl(null);
    setIdentification(null);
    setBenefits(null);
    setIdentifying(false);
    setLoadingBenefits(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Fresh selection clears any previous result.
    setIdentification(null);
    setBenefits(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
    } catch (err) {
      toast.error("Could not load image", { description: (err as Error)?.message });
    }
  };

  const handleIdentify = async () => {
    if (!imageDataUrl) return;
    setIdentifying(true);
    setIdentification(null);
    setBenefits(null);
    try {
      const result = await identifyPlant(imageDataUrl);
      setIdentification(result);
      if (result.is_plant === false) {
        toast("That doesn't look like a plant", {
          description: "Try a clearer photo of a leaf, flower, or whole plant.",
        });
      }
    } catch (err) {
      toast.error("Identification failed", {
        description: (err as Error)?.message || "Please try again.",
      });
    } finally {
      setIdentifying(false);
    }
  };

  const handleGetBenefits = async () => {
    if (!identification?.plant_name) return;
    setLoadingBenefits(true);
    setBenefits(null);
    try {
      const result = await getPlantHealthBenefits(
        identification.plant_name,
        identification.scientific_name || "",
      );
      setBenefits(result);
    } catch (err) {
      toast.error("Could not load health benefits", {
        description: (err as Error)?.message || "Please try again.",
      });
    } finally {
      setLoadingBenefits(false);
    }
  };

  const isPlant = identification?.is_plant !== false;
  const confidence = identification?.confidence ?? 0;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background pb-16">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-primary">
            <Camera className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-secondary sm:text-3xl">Scan a Plant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Snap or upload a photo to identify a plant and explore its evidence-based
            health associations.
          </p>
        </div>

        {/* ==================== SECTION 1 — SCAN INPUT ==================== */}
        <Card className="rounded-3xl border-border/70 p-6 shadow-sm sm:p-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {!imageDataUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-accent/5 px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-accent/10"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Camera className="h-8 w-8" />
              </span>
              <span className="text-lg font-semibold text-secondary">Scan Plant</span>
              <span className="text-sm text-muted-foreground">
                Tap to open your camera or choose a photo
              </span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-border/70">
                <img
                  src={imageDataUrl}
                  alt="Selected plant"
                  className="max-h-80 w-full object-contain bg-muted"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleIdentify}
                  disabled={identifying}
                  className="h-12 flex-1 rounded-2xl bg-primary text-base font-semibold hover:bg-primary/90"
                >
                  {identifying ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Identifying plant…
                    </>
                  ) : (
                    <>
                      <Leaf className="h-5 w-5" /> Identify Plant
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={identifying}
                  className="h-12 rounded-2xl border-primary/30 text-primary hover:bg-accent/10"
                >
                  <RefreshCw className="h-4 w-4" /> Change Photo
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ==================== SECTION 4 — NOT A PLANT ==================== */}
        {identification && !isPlant && (
          <Card className="mt-6 rounded-3xl border-destructive/30 bg-destructive/5 p-6 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
            <h2 className="mt-3 text-lg font-semibold text-secondary">
              We couldn't find a plant in that photo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a clearer, well-lit photo of a single leaf, flower, or whole plant.
            </p>
            <Button className="mt-4 rounded-2xl" onClick={resetAll}>
              <Camera className="h-4 w-4" /> Try Again
            </Button>
          </Card>
        )}

        {/* ==================== SECTION 2 — IDENTIFICATION RESULT ==================== */}
        {identification && isPlant && (
          <Card className="animate-fade-in mt-6 rounded-3xl border-border/70 p-6 shadow-sm sm:p-8">
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
                  alt={identification.plant_name}
                  className="h-32 w-32 shrink-0 self-center rounded-2xl border border-border/70 object-cover sm:self-start"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-secondary">
                    {identification.plant_name}
                  </h2>
                  {confidence > 0 && (
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${confidenceBadge(confidence).className}`}
                    >
                      {confidenceBadge(confidence).label}
                    </span>
                  )}
                </div>
                {identification.scientific_name && (
                  <p className="mt-0.5 text-sm italic text-muted-foreground">
                    {identification.scientific_name}
                  </p>
                )}
                {identification.common_names && identification.common_names.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
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
                <Button
                  onClick={handleGetBenefits}
                  disabled={loadingBenefits}
                  className="mt-5 h-11 rounded-2xl bg-primary text-base font-semibold hover:bg-primary/90"
                >
                  {loadingBenefits ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading benefits…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" /> Get Health Benefits
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ==================== SECTION 3 — HEALTH BENEFITS ==================== */}
        {benefits && benefits.status === "no_data" && (
          <Card className="mt-6 rounded-3xl border-border/70 bg-muted/30 p-6 text-center shadow-sm">
            <Leaf className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">
              {benefits.message ||
                `We identified ${benefits.plant_name} but don't have phytochemical data for it yet.`}
            </p>
          </Card>
        )}

        {benefits && benefits.status !== "no_data" && (
          <div className="animate-fade-in mt-6 space-y-6">
            {/* Phytochemicals */}
            {benefits.phytochemicals.length > 0 && (
              <Card className="rounded-3xl border-border/70 p-6 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-secondary">
                  <Sparkles className="h-5 w-5 text-primary" /> Phytochemicals Found
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

            {/* Evidence-Based Biological Associations */}
            {benefits.health_associations.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-secondary">
                  <Dna className="h-5 w-5 text-primary" /> Evidence-Based Biological
                  Associations
                </h3>
                <div className="space-y-3">
                  {benefits.health_associations.map((a, idx) => {
                    const gm = gradeMeta(a.evidence_grade);
                    const pmids = a.sample_citations
                      .map(pmidFrom)
                      .filter((p): p is string => Boolean(p));
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
                                <RouteIcon className="h-3.5 w-3.5" /> {a.pathway}
                              </p>
                            )}
                            {a.interaction_type && (
                              <p className="text-xs capitalize text-muted-foreground">
                                {a.interaction_type}
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

            {/* Conditions supported */}
            {benefits.conditions_supported.length > 0 && (
              <Card className="rounded-3xl border-border/70 p-6 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-secondary">
                  <Leaf className="h-5 w-5 text-primary" /> Conditions This Plant May Support
                </h3>
                <div className="flex flex-wrap gap-2">
                  {benefits.conditions_supported.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        navigate(`/conditions?q=${encodeURIComponent(c)}`)
                      }
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

            <p className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
              {DISCLAIMER_TEXT}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CamScan;
