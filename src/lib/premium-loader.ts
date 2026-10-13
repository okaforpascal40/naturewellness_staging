/**
 * Timing for the PremiumLoader overlay. Kept out of the component file so
 * React fast refresh keeps working and the maths can be tested directly.
 */

export const STATUS_MESSAGES = [
  "🧬 Discovering disease-associated genes...",
  "🔬 Mapping biological pathways...",
  "🌿 Searching phytochemical database...",
  "📊 Grading scientific evidence...",
  "📚 Retrieving PubMed references...",
  "✨ Preparing your recommendations...",
] as const;

/** How long each status message stays up. */
export const MESSAGE_INTERVAL_MS = 3000;
/** Duration of the fade in/out, kept in sync with the `duration-500` classes. */
export const FADE_MS = 500;

/** How often the elapsed clock advances. */
export const TICK_MS = 500;
/** Lookups outlast one pass through the messages, so keep cycling them. */
export const messageIndex = (elapsedMs: number): number =>
  Math.floor(elapsedMs / MESSAGE_INTERVAL_MS) % STATUS_MESSAGES.length;
