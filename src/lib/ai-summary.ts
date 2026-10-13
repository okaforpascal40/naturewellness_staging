/**
 * Plain-English summary of a condition's recommendations.
 *
 * The request goes to our own backend rather than to api.anthropic.com. Calling
 * Anthropic from the browser would mean shipping the API key in this bundle,
 * where any visitor can read it out of the JS and spend against it; the API
 * also rejects browser origins unless explicitly opted in. The backend holds
 * the key and applies the wording rules.
 */
import { API_BASE } from "./api";

export interface HealthSummaryInput {
  diseaseName: string;
  topFoods: string[];
  topPhytochemicals: string[];
  topGenes: string[];
  evidenceGrade: string;
}

/** Bumped when the prompt or response shape changes, to invalidate old entries. */
const CACHE_VERSION = "v2";
const CACHE_PREFIX = `nw:summary:${CACHE_VERSION}:`;

const cacheKey = (input: HealthSummaryInput): string =>
  CACHE_PREFIX +
  [
    input.diseaseName.toLowerCase().trim(),
    input.topFoods.slice(0, 5).join(",").toLowerCase(),
    input.topPhytochemicals.slice(0, 3).join(",").toLowerCase(),
    input.topGenes.slice(0, 3).join(",").toLowerCase(),
    input.evidenceGrade.toLowerCase(),
  ].join("|");

/** sessionStorage throws in private modes and when storage is disabled. */
function readCache(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeCache(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // A summary that cannot be cached is still a summary — ignore quota errors.
  }
}

/**
 * Generate (or replay from this session's cache) the summary.
 *
 * Throws on failure so the caller can hide the section rather than render a
 * half-broken panel — this is an enhancement, never load-bearing content.
 */
export async function generateHealthSummary(
  input: HealthSummaryInput,
  signal?: AbortSignal,
): Promise<string> {
  const key = cacheKey(input);
  const cached = readCache(key);
  if (cached) return cached;

  const response = await fetch(`${API_BASE}/api/v1/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      disease_name: input.diseaseName,
      top_foods: input.topFoods.slice(0, 5),
      top_phytochemicals: input.topPhytochemicals.slice(0, 3),
      top_genes: input.topGenes.slice(0, 3),
      evidence_grade: input.evidenceGrade,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Summary request failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const data: { summary?: string } = await response.json();
  const summary = (data.summary || "").trim();
  if (!summary) throw new Error("Summary request returned no text.");

  writeCache(key, summary);
  return summary;
}
