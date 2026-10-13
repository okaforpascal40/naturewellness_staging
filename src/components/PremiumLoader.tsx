import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FADE_MS,
  STATUS_MESSAGES,
  TICK_MS,
  messageIndex,
} from "@/lib/premium-loader";

/**
 * Full-screen overlay shown while a condition lookup runs (typically 30–60s
 * against live evidence databases). It narrates the pipeline, spins an arc
 * around the brand leaf, and fades in and out rather than popping, so the
 * hand-off to the results underneath feels deliberate.
 *
 * The backend reports no progress, so the ring is an indeterminate spinner
 * rather than a fill that would have to guess how far along the lookup is.
 */

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** The spinning arc covers a third of the ring. */
const ARC_LENGTH = RING_CIRCUMFERENCE / 3;

const BRAND_DARK = "#2D6A4F";
const BRAND_LIGHT = "#52B788";

/** Deterministic layout so particles don't jump between renders. */
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: 30 + ((i * 53) % 65),
  size: 4 + (i % 4) * 2,
  delay: (i * 0.7) % 6,
  duration: 5 + (i % 5),
  color: i % 3 === 0 ? BRAND_DARK : BRAND_LIGHT,
}));

interface PremiumLoaderProps {
  /** While true the overlay is shown; flipping to false fades it out. */
  visible: boolean;
}

const PremiumLoader = ({ visible }: PremiumLoaderProps) => {
  const [mounted, setMounted] = useState(visible);
  const [leaving, setLeaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Mount immediately on show; on hide, keep rendering long enough to fade out.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      setLeaving(false);
      setElapsed(0);
      return;
    }
    setLeaving(true);
    const timer = window.setTimeout(() => setMounted(false), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setInterval(
      () => setElapsed((ms) => ms + TICK_MS),
      TICK_MS,
    );
    return () => window.clearInterval(timer);
  }, [visible]);

  // The overlay covers the viewport: stop the page behind it from scrolling,
  // and take it out of the tab order and accessibility tree while it's hidden.
  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const appRoot = document.getElementById("root");
    const wasInert = appRoot?.inert ?? false;
    if (appRoot) appRoot.inert = true;
    return () => {
      document.body.style.overflow = previous;
      if (appRoot) appRoot.inert = wasInert;
    };
  }, [mounted]);

  if (!mounted) return null;

  const index = messageIndex(elapsed);
  const message = STATUS_MESSAGES[index];

  // Portalled to <body> so it sits outside #root, which is made inert above.
  return createPortal(
    <div
      data-testid="premium-loader"
      className={`fixed inset-0 z-[100] overflow-y-auto bg-gradient-to-b from-white via-[#F3FAF6] to-[#E3F4EA] duration-500 ${
        leaving
          ? "pointer-events-none animate-out fade-out fill-mode-forwards"
          : "animate-in fade-in"
      }`}
    >
      {/* Drifting particles */}
      <div
        className="pointer-events-none absolute inset-0 motion-reduce:hidden"
        aria-hidden="true"
      >
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full opacity-0 animate-particle-drift"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative flex min-h-full flex-col items-center px-4">
        <div className="flex flex-1 flex-col items-center justify-center py-10">
          {/* Leaf + spinning ring */}
          <div className="relative h-36 w-36 sm:h-48 sm:w-48">
            <span
              className="absolute inset-4 rounded-full blur-2xl motion-safe:animate-leaf-breathe"
              style={{ backgroundColor: `${BRAND_LIGHT}33` }}
              aria-hidden="true"
            />
            <svg
              viewBox="0 0 120 120"
              data-testid="premium-loader-ring"
              className="absolute inset-0 h-full w-full motion-safe:animate-ring-spin"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="premium-loader-ring"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={BRAND_LIGHT} />
                  <stop offset="100%" stopColor={BRAND_DARK} />
                </linearGradient>
              </defs>
              <circle
                cx="60"
                cy="60"
                r={RING_RADIUS}
                fill="none"
                stroke={`${BRAND_LIGHT}2E`}
                strokeWidth="4"
              />
              <circle
                cx="60"
                cy="60"
                r={RING_RADIUS}
                fill="none"
                stroke="url(#premium-loader-ring)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${ARC_LENGTH} ${RING_CIRCUMFERENCE}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                viewBox="0 0 80 80"
                className="h-20 w-20 motion-safe:animate-leaf-breathe sm:h-24 sm:w-24"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient
                    id="premium-loader-leaf"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={BRAND_LIGHT} />
                    <stop offset="100%" stopColor={BRAND_DARK} />
                  </linearGradient>
                </defs>
                <path
                  d="M40 8 C40 8 65 22 65 44 C65 58 54 68 40 68 C26 68 15 58 15 44 C15 22 40 8 40 8 Z"
                  fill="url(#premium-loader-leaf)"
                />
                <path
                  d="M40 64 C40 64 40 20 40 10"
                  stroke="#D8F3DC"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <path
                  d="M40 52 C33 48 24 46 18 44"
                  stroke="#D8F3DC"
                  strokeWidth="1"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path
                  d="M40 42 C33 38 25 36 19 33"
                  stroke="#D8F3DC"
                  strokeWidth="1"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path
                  d="M40 52 C47 48 56 46 62 44"
                  stroke="#D8F3DC"
                  strokeWidth="1"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path
                  d="M40 42 C47 38 55 36 61 33"
                  stroke="#D8F3DC"
                  strokeWidth="1"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </svg>
            </div>
          </div>

          <p
            className="mt-6 font-serif text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: BRAND_DARK }}
          >
            NatureWellness
          </p>

          {/* Stable live region; the keyed line inside re-animates on each change */}
          <div
            role="status"
            aria-live="polite"
            className="mt-4 min-h-[1.75rem] max-w-md text-center"
          >
            <p
              key={index}
              className="text-base font-medium motion-safe:animate-status-in sm:text-lg"
              style={{ color: BRAND_DARK }}
            >
              {message}
            </p>
          </div>

          {/* Step dots */}
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            {STATUS_MESSAGES.map((m, i) => (
              <span
                key={m}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: i === index ? 18 : 6,
                  backgroundColor:
                    i === index ? BRAND_DARK : `${BRAND_LIGHT}66`,
                }}
              />
            ))}
          </div>
        </div>

        <p className="pb-8 text-center text-xs italic text-[#2D6A4F] sm:pb-10 sm:text-sm">
          Analyzing peer-reviewed literature
        </p>
      </div>
    </div>,
    document.body,
  );
};

export default PremiumLoader;
