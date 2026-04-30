const API_BASE = "https://naturewellness-backend-production.up.railway.app";

export interface Citation {
  pmid?: string;
  title?: string;
  authors?: string;
  journal?: string;
  year?: number | string;
  url?: string;
}

export interface Recommendation {
  fruit_vegetable: string;
  phytochemical: string;
  gene_target: string;
  pathway_name: string;
  evidence_grade: "A" | "B" | "C" | string;
  publication_count: number;
  interaction_type: string;
  sample_citations?: Citation[];
}

export interface AutomationRunResponse {
  run_id?: string;
  disease_id?: string;
  disease_name?: string;
  genes_found: number;
  pathways_found: number;
  compounds_found: number;
  foods_found: number;
  recommendations: Recommendation[];
  status: string;
}

export const DISEASE_MAP: { id: string; name: string; mondoId: string; category: string; description: string }[] = [
  {
    id: "alzheimers",
    name: "Alzheimer's Disease",
    mondoId: "MONDO_0004975",
    category: "Neurological",
    description: "A progressive neurodegenerative disease affecting memory and cognitive function.",
  },
  {
    id: "breast-cancer",
    name: "Breast Cancer",
    mondoId: "MONDO_0007254",
    category: "Cellular",
    description: "A type of cancer that forms in the cells of the breasts.",
  },
  {
    id: "prostate-cancer",
    name: "Prostate Cancer",
    mondoId: "MONDO_0008315",
    category: "Cellular",
    description: "Cancer that occurs in the prostate gland in males.",
  },
  {
    id: "type-2-diabetes",
    name: "Type 2 Diabetes",
    mondoId: "MONDO_0005148",
    category: "Metabolic",
    description: "A chronic condition that affects the way the body processes blood sugar (glucose).",
  },
];

export interface OpenTargetsDisease {
  id: string; // e.g. "EFO_0000249", "MONDO_0004975"
  name: string;
  description?: string;
}

const OT_GRAPHQL = "https://api.platform.opentargets.org/api/v4/graphql";

export async function searchOpenTargetsDiseases(
  query: string,
  signal?: AbortSignal,
): Promise<OpenTargetsDisease[]> {
  if (!query.trim()) return [];
  const gql = `
    query SearchDisease($q: String!) {
      search(queryString: $q, entityNames: ["disease"], page: { index: 0, size: 8 }) {
        hits {
          id
          name
          entity
          description
        }
      }
    }
  `;
  const res = await fetch(OT_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql, variables: { q: query } }),
    signal,
  });
  if (!res.ok) throw new Error(`Open Targets search failed: ${res.status}`);
  const json = await res.json();
  const hits = json?.data?.search?.hits ?? [];
  return hits
    .filter((h: any) => h.entity === "disease")
    .slice(0, 5)
    .map((h: any) => ({ id: h.id, name: h.name, description: h.description }));
}

export async function runAutomation(mondoId: string, maxGenes = 10): Promise<AutomationRunResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout

  try {
    const res = await fetch(`${API_BASE}/api/v1/automation/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disease_id: mondoId, max_genes: maxGenes }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}: ${text}`);
    }

    return await res.json();
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. The analysis is taking longer than expected. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
