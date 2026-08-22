import { useEffect, useState } from "react";
import { BookOpen, Dna, FlaskConical, Leaf, Route as RouteIcon, Sparkles } from "lucide-react";

/**
 * The condition lookup takes 30–60s against live evidence databases. A bare
 * spinner for that long reads as broken, so we narrate the pipeline as it runs
 * and show skeleton cards in the shape of the results that are coming.
 *
 * The stage timings mirror the real pipeline order (genes → pathways →
 * compounds → grading) so the copy stays honest rather than decorative.
 */
interface Stage {
  /** Seconds after mount at which this stage becomes current. */
  at: number;
  label: string;
  icon: typeof Dna;
}

const STAGES: Stage[] = [
  { at: 0, label: "Finding disease genes…", icon: Dna },
  { at: 2, label: "Mapping pathways…", icon: RouteIcon },
  { at: 4, label: "Searching phytochemical database…", icon: FlaskConical },
  { at: 8, label: "Grading evidence…", icon: BookOpen },
  { at: 15, label: "Almost ready…", icon: Sparkles },
];

const SKELETON_ROWS = 4;

export const LoadingCard = () => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // A 1s tick is enough to drive stage changes and costs nothing.
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // The last stage whose threshold we have passed.
  const activeIndex = STAGES.reduce(
    (best, stage, index) => (elapsed >= stage.at ? index : best),
    0,
  );
  const active = STAGES[activeIndex];
  const ActiveIcon = active.icon;

  return (
    <div className="mx-auto max-w-3xl py-10" role="status" aria-live="polite">
      {/* Pulsing brand mark */}
      <div className="flex flex-col items-center text-center">
        <span className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:2s]" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-primary">
            <Leaf className="h-8 w-8" aria-hidden="true" />
          </span>
        </span>

        <p className="mt-5 flex items-center gap-2 text-lg font-semibold text-secondary">
          <ActiveIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          {active.label}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Searching CTD, Open Targets and PubMed — this usually takes 30–60 seconds
        </p>

        {/* Stage rail: done / current / pending */}
        <ol className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
          {STAGES.map((stage, index) => {
            const done = index < activeIndex;
            const current = index === activeIndex;
            return (
              <li key={stage.label} className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full transition-colors ${
                    done
                      ? "bg-primary"
                      : current
                        ? "bg-primary animate-pulse"
                        : "bg-border"
                  }`}
                />
                {index < STAGES.length - 1 && (
                  <span
                    className={`h-px w-6 transition-colors ${
                      done ? "bg-primary/40" : "bg-border"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Skeletons shaped like the food rows that will replace them */}
      <div className="mt-10 space-y-3" aria-hidden="true">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div
                className="h-4 animate-pulse rounded bg-muted"
                style={{ width: `${55 - i * 6}%` }}
              />
              <div
                className="h-3 animate-pulse rounded bg-muted/70"
                style={{ width: `${38 - i * 4}%` }}
              />
            </div>
            <div className="h-6 w-16 shrink-0 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>

      <span className="sr-only">Loading recommendations. {active.label}</span>
    </div>
  );
};

export default LoadingCard;
