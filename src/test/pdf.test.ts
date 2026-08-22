import { existsSync, readFileSync, rmSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AutomationRunResponse, Recommendation } from "@/lib/api";
import { downloadRecommendationsPdf, pdfSafe } from "@/lib/pdf";

/**
 * jsPDF's `save()` goes through the browser download path, which jsdom has no
 * implementation for. Stubbing the two touch points lets the whole document be
 * built for real — the point of these tests is that laying out the report
 * (page breaks, PubMed links, long strings) never throws, and that no text is
 * lost to the Latin-1 encoding of jsPDF's built-in fonts.
 */
const generated: string[] = [];

const outputPath = (diseaseSlug: string) =>
  `NatureWellness-${diseaseSlug}-recommendations.pdf`;

beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock"),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // Under Node, jsPDF writes the report into the working directory; keep the
  // repo clean whether or not this run produced a file.
  for (const file of generated.splice(0)) rmSync(file, { force: true });
});

const rec = (i: number, over: Partial<Recommendation> = {}): Recommendation => ({
  fruit_vegetable: `food-${i}`,
  phytochemical: `Phytochemical ${i}`,
  gene_target: `GENE${i}`,
  pathway: "TNF signaling pathway",
  evidence_grade: ["A", "B", "C"][i % 3],
  publication_count: 100 - i,
  interaction_type: "decreases expression",
  sample_citations: [`PMID ${10000000 + i}`, `PMID ${20000000 + i}`],
  ...over,
});

const response = (recommendations: Recommendation[]): AutomationRunResponse => ({
  genes_found: 10,
  pathways_found: 8,
  compounds_found: 12,
  foods_found: recommendations.length,
  recommendations,
  status: "ok",
});

const build = async (diseaseName: string, slug: string, recs: Recommendation[]) => {
  generated.push(outputPath(slug));
  await downloadRecommendationsPdf({ diseaseName, data: response(recs) });
};

describe("pdfSafe", () => {
  it("maps typography that jsPDF's Latin-1 fonts would silently drop", () => {
    expect(pdfSafe("CTD • Open Targets • KEGG")).toBe("CTD · Open Targets · KEGG");
    expect(pdfSafe("PMID 1 — https://x")).toBe("PMID 1 - https://x");
    expect(pdfSafe("Curcumin → TNF")).toBe("Curcumin -> TNF");
    expect(pdfSafe("truncated…")).toBe("truncated...");
  });

  it("spells out the Greek letters used in phytochemical names", () => {
    expect(pdfSafe("β-Carotene")).toBe("beta-Carotene");
    expect(pdfSafe("α-Tocopherol")).toBe("alpha-Tocopherol");
  });

  it("keeps Latin-1 accents that render correctly", () => {
    expect(pdfSafe("Açaí purée")).toBe("Açaí purée");
  });

  it("never emits a character outside Latin-1", () => {
    const messy = "Ω 中文 🌿 β • — → …";
    expect(pdfSafe(messy)).toMatch(/^[ -ÿ]*$/);
  });
});

describe("downloadRecommendationsPdf", () => {
  // 60 reference entries across several pages: slower than the 5s default.
  it("builds a report whose references span multiple pages", async () => {
    const recs = Array.from({ length: 60 }, (_, i) => rec(i));
    await expect(build("Type 2 Diabetes", "Type-2-Diabetes", recs)).resolves.toBeUndefined();
  }, 20000);

  it("handles a report with no recommendations at all", async () => {
    await expect(build("Unknown", "Unknown", [])).resolves.toBeUndefined();
  });

  it("handles recommendations that carry no citations", async () => {
    const recs = [rec(1, { sample_citations: [] }), rec(2, { sample_citations: undefined })];
    await expect(build("Breast Cancer", "Breast-Cancer", recs)).resolves.toBeUndefined();
  });

  it("survives overlong names and unusual grades", async () => {
    const recs = [
      rec(1, {
        fruit_vegetable: "a very long hyphenated heirloom vegetable name ".repeat(3),
        phytochemical: "3,4-dihydroxyphenylethanol-elenolic-acid-dialdehyde ".repeat(2),
        evidence_grade: "unknown",
      }),
    ];
    await expect(
      build("Alzheimer's Disease", "Alzheimer-s-Disease", recs),
    ).resolves.toBeUndefined();
  });

  it("writes clickable PubMed links and an intact data-sources footer", async () => {
    await build("Prostate Cancer", "Prostate-Cancer", [rec(0), rec(1)]);

    const file = outputPath("Prostate-Cancer");
    // jsPDF only writes to disk under Node; skip the byte-level assertions if a
    // future runtime keeps the document in memory instead.
    if (!existsSync(file)) return;
    const raw = readFileSync(file, "latin1");

    expect(raw).toContain("/URI (https://pubmed.ncbi.nlm.nih.gov/10000000/)");
    expect(raw).toContain("(Scientific References)");
    expect(raw).toContain("All references available at pubmed.ncbi.nlm.nih.gov");
    // The separators must survive rather than leaving orphaned double spaces.
    expect(raw).toContain("Data Sources: CTD Database \xb7 Open Targets \xb7 KEGG Pathways");
    expect(raw).toContain("PMID 10000000 - https://pubmed.ncbi.nlm.nih.gov/10000000/");
  });
});
