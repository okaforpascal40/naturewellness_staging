/**
 * Deep links to the public pathway and interaction databases.
 *
 * These are search URLs rather than direct diagram URLs: our pathway names come
 * from KEGG's own gene→pathway mapping as free text ("TNF signaling pathway"),
 * not as map identifiers, so there is no id to link straight to. Where a name
 * does carry its KEGG map id we use it and land on the diagram itself.
 */

const KEGG_SEARCH = "https://www.genome.jp/kegg-bin/search_pathway_text";
// kegg.jp/pathway/<id>, not genome.jp/pathway?<id> — the latter 404s.
const KEGG_MAP = "https://www.kegg.jp/pathway";
const REACTOME_SEARCH = "https://reactome.org/content/query";
const STRING_NETWORK = "https://string-db.org/network";
const STRING_SEARCH = "https://string-db.org/cgi/network";

/**
 * KEGG map ids look like "hsa04668" or "map04668" and sometimes appear inside
 * the pathway name. When present they address the diagram directly.
 */
const KEGG_ID_RE = /\b((?:hsa|map|ko)\d{5})\b/i;

export function keggPathwayId(pathwayName: string): string | null {
  const match = (pathwayName || "").match(KEGG_ID_RE);
  return match ? match[1].toLowerCase() : null;
}

/** KEGG diagram for a pathway — the map itself when we can identify it. */
export function keggPathwayUrl(pathwayName: string): string {
  const name = (pathwayName || "").trim();
  const id = keggPathwayId(name);
  if (id) return `${KEGG_MAP}/${id}`;

  const params = new URLSearchParams({
    query: name,
    target: "pathway",
    viewImage: "true",
  });
  return `${KEGG_SEARCH}?${params.toString()}`;
}

/** Reactome search for a pathway, restricted to pathway records. */
export function reactomePathwayUrl(pathwayName: string): string {
  const params = new URLSearchParams({
    q: (pathwayName || "").trim(),
    types: "Pathway",
  });
  return `${REACTOME_SEARCH}?${params.toString()}`;
}

/**
 * STRING interaction network for a gene.
 *
 * STRING's /network/<id> path expects a STRING protein identifier, and a bare
 * HGNC symbol only resolves there by luck. The search entry point takes a
 * symbol plus a species and always lands somewhere useful — 9606 is human.
 */
export function stringNetworkUrl(gene: string, species = "9606"): string {
  const symbol = (gene || "").trim();
  if (!symbol) return `${STRING_NETWORK}`;
  const params = new URLSearchParams({ identifiers: symbol, species });
  return `${STRING_SEARCH}?${params.toString()}`;
}

/**
 * STRING network for several genes at once — the more useful view when a
 * condition implicates a set of them, since it shows how they interact.
 */
export function stringMultiNetworkUrl(genes: string[], species = "9606"): string {
  const symbols = (genes || []).map((g) => (g || "").trim()).filter(Boolean);
  if (symbols.length === 0) return `${STRING_NETWORK}`;
  if (symbols.length === 1) return stringNetworkUrl(symbols[0], species);
  const params = new URLSearchParams({
    // STRING separates multiple identifiers with a carriage return.
    identifiers: symbols.slice(0, 12).join("\r"),
    species,
  });
  return `${STRING_SEARCH}?${params.toString()}`;
}

/** Open a database link in a new tab, severing the opener for safety. */
export function openExternal(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
