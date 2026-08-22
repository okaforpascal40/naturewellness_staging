/**
 * Scientific-source helpers shared by the recommendations screen, CamScan and
 * the PDF export.
 *
 * The backend returns citations as plain strings ("PMID 12345678"), but the
 * `Citation` shape allows structured records too, so every reader here accepts
 * both. Nothing in this module calls the network — it only reshapes the
 * `Recommendation` rows into the reference groups the UI cites.
 */
import type { Citation, Recommendation } from "./api";
import { dataSourceLabel, evidenceType, normalizeGrade, type GradeKey } from "./food-display";

export const PUBMED_BASE = "https://pubmed.ncbi.nlm.nih.gov";

/** Human-readable host, for print output where a full URL is noise. */
export const PUBMED_HOST = "pubmed.ncbi.nlm.nih.gov";

/** Databases behind every recommendation, in the order we cite them. */
export const DATA_SOURCES = [
  "Comparative Toxicogenomics Database (CTD)",
  "Open Targets Platform",
  "KEGG Pathway Database",
  "PubMed / NCBI",
] as const;

/** One-line version of {@link DATA_SOURCES} for chips, banners and footers. */
export const DATA_SOURCE_SUMMARY = "CTD Database • Open Targets • KEGG Pathways";

/** Attribution for curated chemical–gene interactions. */
export const CTD_DATABASE = "CTD Database";

/** Prompt shown wherever a list of PubMed links is rendered. */
export const PUBMED_HINT = "Click any PubMed reference to read the original publication";

/** Fallback study-type label when the interaction phrase is unrecognised. */
export const DEFAULT_EVIDENCE_TYPE = "Association Study";

/** Canonical record URL for a PubMed identifier. */
export const pubmedUrl = (pmid: string): string => `${PUBMED_BASE}/${pmid}/`;

/** PubMed search URL for free-text terms — used when no PMID is available. */
export function pubmedSearchUrl(terms: (string | undefined | null)[]): string {
  const query = terms.map((t) => (t || "").trim()).filter(Boolean).join(" ");
  return `${PUBMED_BASE}/?term=${encodeURIComponent(query)}`;
}

/** Extract a numeric PMID from a Citation object or a raw "PMID: 12345678" string. */
export function pmidFromCitation(c: Citation | string): string | undefined {
  if (typeof c === "string") {
    // The bare-number fallback needs five digits: a four-digit run in a free-text
    // citation ("Smith et al., 2020, J Nutr") is a publication year, and linking
    // it would send the reader to an unrelated PubMed record.
    const m = c.match(/PMID[:\s]*?(\d{4,9})/i) ?? c.match(/\b(\d{5,9})\b/);
    return m?.[1];
  }
  if (c.pmid) {
    const m = String(c.pmid).match(/(\d{4,9})/);
    if (m) return m[1];
  }
  if (c.url) {
    const m = c.url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d{4,9})/i);
    if (m) return m[1];
  }
  return undefined;
}

/** Unique PMIDs for a set of citations, preserving first-seen order. */
export function pmidsFor(citations?: (Citation | string)[]): string[] {
  const out: string[] = [];
  for (const c of citations ?? []) {
    const pmid = pmidFromCitation(c);
    if (pmid && !out.includes(pmid)) out.push(pmid);
  }
  return out;
}

/** Study type implied by a CTD interaction phrase, never null. */
export function referenceEvidenceType(interaction?: string | null): string {
  return evidenceType(interaction) ?? DEFAULT_EVIDENCE_TYPE;
}

/* ------------------------------------------------------------------ */
/* Reference groups — one academic entry per phytochemical–gene pair    */
/* ------------------------------------------------------------------ */

export interface ReferenceGroup {
  /** Stable identity: lowercased `phytochemical|gene`. */
  key: string;
  phytochemical: string;
  gene: string;
  grade: GradeKey;
  /** Publications supporting the pair (never a sum across foods — see below). */
  publicationCount: number;
  interactionType: string;
  pathway: string;
  pmids: string[];
  /** Foods carrying this phytochemical, for context on the reference card. */
  foods: string[];
  source: string;
  evidenceType: string;
}

const GRADE_RANK: Record<GradeKey, number> = { A: 3, B: 2, C: 1, None: 0 };

const pairKey = (phytochemical: string, gene: string): string =>
  `${phytochemical.trim().toLowerCase()}|${gene.trim().toLowerCase()}`;

/**
 * Collapse the recommendation rows into one reference entry per
 * (phytochemical, gene) pair that actually carries citations.
 *
 * The backend emits one row per *food* carrying a compound, so the same pair
 * repeats with an identical `publication_count`. Summing those would inflate
 * the literature count several-fold, so the count is taken as the maximum
 * across the pair's rows, never the sum.
 */
export function groupReferences(recs: Recommendation[]): ReferenceGroup[] {
  const map = new Map<string, ReferenceGroup>();

  for (const r of recs) {
    const phytochemical = (r.phytochemical || "").trim();
    const gene = (r.gene_target || "").trim();
    if (!phytochemical && !gene) continue;

    const pmids = pmidsFor(r.sample_citations);
    if (pmids.length === 0) continue;

    const key = pairKey(phytochemical, gene);
    const grade = normalizeGrade(r.evidence_grade);
    const food = (r.fruit_vegetable || "").trim();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        phytochemical: phytochemical || "Phytochemical",
        gene: gene || "—",
        grade,
        publicationCount: r.publication_count || 0,
        interactionType: (r.interaction_type || "").trim(),
        pathway: (r.pathway || "").trim(),
        pmids,
        foods: food ? [food] : [],
        source: dataSourceLabel(r),
        evidenceType: referenceEvidenceType(r.interaction_type),
      });
      continue;
    }

    if (GRADE_RANK[grade] > GRADE_RANK[existing.grade]) existing.grade = grade;
    existing.publicationCount = Math.max(existing.publicationCount, r.publication_count || 0);
    for (const pmid of pmids) {
      if (!existing.pmids.includes(pmid)) existing.pmids.push(pmid);
    }
    if (food && !existing.foods.some((f) => f.toLowerCase() === food.toLowerCase())) {
      existing.foods.push(food);
    }
    if (!existing.pathway && r.pathway) existing.pathway = r.pathway.trim();
    if (!existing.interactionType && r.interaction_type) {
      existing.interactionType = r.interaction_type.trim();
      existing.evidenceType = referenceEvidenceType(r.interaction_type);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      GRADE_RANK[b.grade] - GRADE_RANK[a.grade] ||
      b.publicationCount - a.publicationCount ||
      a.phytochemical.localeCompare(b.phytochemical),
  );
}

/**
 * Distinct publications behind a recommendation set.
 *
 * Counted once per (phytochemical, gene) pair for the same reason
 * {@link groupReferences} takes a maximum rather than a sum.
 */
export function totalPublicationCount(recs: Recommendation[]): number {
  const best = new Map<string, number>();
  for (const r of recs) {
    const key = pairKey(r.phytochemical || "", r.gene_target || "");
    best.set(key, Math.max(best.get(key) ?? 0, r.publication_count || 0));
  }
  let total = 0;
  for (const count of best.values()) total += count;
  return total;
}

/** Every distinct PMID across a set of reference groups. */
export function uniquePmidCount(groups: ReferenceGroup[]): number {
  const seen = new Set<string>();
  for (const g of groups) for (const pmid of g.pmids) seen.add(pmid);
  return seen.size;
}
