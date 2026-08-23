import { useEffect, useState } from "react";
import {
  Bug,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Info,
  Leaf,
  ShieldCheck,
  Sprout,
  TriangleAlert,
} from "lucide-react";
import type { PlantCondition } from "@/lib/api";

/**
 * Plant health diagnosis: overall status, then a card per detected condition
 * with its treatment options.
 *
 * Severity drives colour, and an unlabelled condition is shown as a caution
 * rather than as benign — the backend defaults `is_harmful` to true for the
 * same reason.
 */

interface SeverityStyle {
  label: string;
  card: string;
  chip: string;
  bar: string;
  icon: typeof Bug;
}

/**
 * Non-harmful findings (lichen cover, cosmetic marks) are informational
 * whatever their confidence; harmful ones escalate with certainty.
 */
function severityFor(condition: PlantCondition): SeverityStyle {
  const probability = condition.probability ?? 0;
  if (condition.is_harmful === false) {
    return {
      label: "Not harmful",
      card: "border-sky-200 bg-sky-50/60",
      chip: "bg-sky-100 text-sky-900",
      bar: "bg-sky-500",
      icon: Info,
    };
  }
  if (probability > 0.8) {
    return {
      label: "Likely",
      card: "border-destructive/30 bg-destructive/5",
      chip: "bg-destructive text-destructive-foreground",
      bar: "bg-destructive",
      icon: TriangleAlert,
    };
  }
  if (probability >= 0.5) {
    return {
      label: "Possible",
      card: "border-evidence-b/40 bg-evidence-b/10",
      chip: "bg-evidence-b text-evidence-b-foreground",
      bar: "bg-evidence-b",
      icon: Bug,
    };
  }
  return {
    label: "Low confidence",
    card: "border-border/70 bg-muted/30",
    chip: "bg-muted text-foreground/75",
    bar: "bg-muted-foreground/50",
    icon: Bug,
  };
}

const percent = (value: number | undefined): number =>
  Math.round(Math.min(1, Math.max(0, value ?? 0)) * 100);

/** Fills from zero once mounted so the bar animates in. */
const ConfidenceBar = ({ value, className }: { value: number; className: string }) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setWidth(value), 60);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="img"
      aria-label={`${value}% confidence`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${className}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

const TreatmentBlock = ({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Leaf;
  title: string;
  body: string;
}) => (
  <div>
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      {title}
    </p>
    <p className="mt-1 text-sm leading-relaxed text-foreground/85">{body}</p>
  </div>
);

const ConditionCard = ({ condition, index }: { condition: PlantCondition; index: number }) => {
  const [open, setOpen] = useState(false);
  const severity = severityFor(condition);
  const SeverityIcon = severity.icon;
  const confidence = percent(condition.probability);
  const panelId = `condition-treatment-${index}`;

  const treatment = condition.treatment ?? {};
  const hasTreatment = Boolean(
    treatment.biological?.trim() || treatment.chemical?.trim() || treatment.prevention?.trim(),
  );

  return (
    <li className={`rounded-2xl border p-4 shadow-sm ${severity.card}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/70 text-foreground/80">
          <SeverityIcon className="h-4.5 w-4.5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold capitalize text-foreground">{condition.name}</h4>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${severity.chip}`}
            >
              {confidence}% · {severity.label}
            </span>
          </div>

          <div className="mt-2">
            <ConfidenceBar value={confidence} className={severity.bar} />
          </div>

          {condition.description && (
            <p className="mt-2.5 text-sm leading-relaxed text-foreground/85">
              {condition.description}
            </p>
          )}

          {hasTreatment && (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={panelId}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-background/70 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-accent/15"
              >
                {open ? "Hide treatment" : "Treatment options"}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {/* Kept mounted so aria-controls always resolves. */}
              <div
                id={panelId}
                hidden={!open}
                className="animate-fade-in mt-3 space-y-3 rounded-xl bg-background/70 p-3"
              >
                {treatment.biological?.trim() && (
                  <TreatmentBlock
                    icon={Leaf}
                    title="Biological treatment"
                    body={treatment.biological}
                  />
                )}
                {treatment.chemical?.trim() && (
                  <TreatmentBlock
                    icon={FlaskConical}
                    title="Chemical treatment"
                    body={treatment.chemical}
                  />
                )}
                {treatment.prevention?.trim() && (
                  <TreatmentBlock
                    icon={ShieldCheck}
                    title="Prevention"
                    body={treatment.prevention}
                  />
                )}
              </div>
            </>
          )}

          {condition.url && (
            <a
              href={condition.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Learn more about ${condition.name} (opens in a new tab)`}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Learn more
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
};

interface PlantHealthPanelProps {
  isHealthy: boolean;
  healthProbability?: number;
  conditions: PlantCondition[];
  available: boolean;
}

export const PlantHealthPanel = ({
  isHealthy,
  healthProbability,
  conditions,
  available,
}: PlantHealthPanelProps) => {
  if (!available) {
    return (
      <Card>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          No health assessment was returned for this photo. Try a clearer, closer
          shot of the leaves.
        </p>
      </Card>
    );
  }

  const healthy = isHealthy && conditions.every((c) => c.is_harmful === false);

  return (
    <div className="space-y-4">
      {/* Status banner — the pulse marks it as a live reading, not a label. */}
      <div
        role="status"
        className={`flex items-start gap-3 rounded-2xl border p-4 ${
          healthy
            ? "border-evidence-a/30 bg-evidence-a/10"
            : "border-evidence-b/40 bg-evidence-b/10"
        }`}
      >
        <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center">
          <span
            className={`absolute inset-0 animate-ping rounded-full [animation-duration:2.4s] ${
              healthy ? "bg-evidence-a/20" : "bg-evidence-b/25"
            }`}
          />
          <span
            className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
              healthy ? "text-evidence-a" : "text-evidence-b"
            }`}
          >
            {healthy ? (
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            ) : (
              <TriangleAlert className="h-6 w-6" aria-hidden="true" />
            )}
          </span>
        </span>

        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {healthy ? "This plant appears healthy" : "Health issues detected"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {healthy
              ? "No signs of disease, pests or deficiencies were detected."
              : `This plant shows signs of ${conditions.length} possible condition${
                  conditions.length === 1 ? "" : "s"
                }.`}
          </p>
          {typeof healthProbability === "number" && healthy && (
            <p className="mt-1 text-xs text-muted-foreground">
              {percent(healthProbability)}% confidence
            </p>
          )}
        </div>
      </div>

      {conditions.length > 0 && (
        <ul role="list" className="space-y-3">
          {conditions.map((condition, index) => (
            <ConditionCard key={`${condition.name}-${index}`} condition={condition} index={index} />
          ))}
        </ul>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <Sprout className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        Automated assessment from a single photo. Confirm with a local
        horticulturist or extension service before treating a crop.
      </p>
    </div>
  );
};

/** Small local card so this component has no dependency on the page's layout. */
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">{children}</div>
);

export default PlantHealthPanel;
