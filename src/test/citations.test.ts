import { describe, expect, it } from "vitest";
import type { Recommendation } from "@/lib/api";
import {
  DATA_SOURCES,
  groupReferences,
  pmidFromCitation,
  pmidsFor,
  pubmedSearchUrl,
  pubmedUrl,
  referenceEvidenceType,
  totalPublicationCount,
  uniquePmidCount,
} from "@/lib/citations";

const rec = (over: Partial<Recommendation>): Recommendation => ({
  fruit_vegetable: "apple",
  phytochemical: "Quercetin",
  gene_target: "TNF",
  pathway: "TNF signaling pathway",
  evidence_grade: "B",
  publication_count: 12,
  interaction_type: "decreases expression",
  sample_citations: ["PMID 111111"],
  ...over,
});

describe("pmidFromCitation", () => {
  it("reads the PMID out of a backend citation string", () => {
    expect(pmidFromCitation("PMID 12345678")).toBe("12345678");
    expect(pmidFromCitation("PMID: 12345678")).toBe("12345678");
  });

  it("falls back to a bare number in free text", () => {
    expect(pmidFromCitation("Smith et al. (9876543)")).toBe("9876543");
  });

  it("never mistakes a publication year for a PMID", () => {
    expect(pmidFromCitation("Smith et al., 2020, J Nutr")).toBeUndefined();
    expect(pmidFromCitation("Smith et al., 2020 (9876543)")).toBe("9876543");
  });

  it("reads structured citations from pmid or url", () => {
    expect(pmidFromCitation({ pmid: "PMID 2222222" })).toBe("2222222");
    expect(
      pmidFromCitation({ url: "https://pubmed.ncbi.nlm.nih.gov/3333333/" }),
    ).toBe("3333333");
  });

  it("returns undefined when there is no identifier", () => {
    expect(pmidFromCitation("no identifier here")).toBeUndefined();
    expect(pmidFromCitation({ title: "Untitled" })).toBeUndefined();
  });
});

describe("pmidsFor", () => {
  it("de-duplicates while preserving order", () => {
    expect(pmidsFor(["PMID 222", "PMID 1111111", "PMID 1111111", "PMID 2222222"])).toEqual([
      "1111111",
      "2222222",
    ]);
  });

  it("tolerates a missing citation list", () => {
    expect(pmidsFor(undefined)).toEqual([]);
  });
});

describe("pubmed urls", () => {
  it("builds record and search urls", () => {
    expect(pubmedUrl("12345678")).toBe("https://pubmed.ncbi.nlm.nih.gov/12345678/");
    expect(pubmedSearchUrl(["Curcumin", "TNF", ""])).toBe(
      "https://pubmed.ncbi.nlm.nih.gov/?term=Curcumin%20TNF",
    );
  });
});

describe("referenceEvidenceType", () => {
  it("labels mechanistic and association studies", () => {
    expect(referenceEvidenceType("decreases expression")).toBe("Mechanistic Study");
    expect(referenceEvidenceType("binding")).toBe("Association Study");
  });

  it("falls back rather than returning nothing", () => {
    expect(referenceEvidenceType("")).toBe("Association Study");
    expect(referenceEvidenceType(null)).toBe("Association Study");
  });
});

describe("groupReferences", () => {
  it("collapses one entry per phytochemical–gene pair and merges foods and PMIDs", () => {
    const groups = groupReferences([
      rec({ fruit_vegetable: "apple", sample_citations: ["PMID 111111"] }),
      rec({ fruit_vegetable: "onion", sample_citations: ["PMID 111111", "PMID 222222"] }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].foods).toEqual(["apple", "onion"]);
    expect(groups[0].pmids).toEqual(["111111", "222222"]);
    expect(groups[0].gene).toBe("TNF");
    expect(groups[0].phytochemical).toBe("Quercetin");
  });

  it("keeps the pair publication count rather than summing across foods", () => {
    const groups = groupReferences([
      rec({ fruit_vegetable: "apple", publication_count: 140 }),
      rec({ fruit_vegetable: "onion", publication_count: 140 }),
    ]);
    expect(groups[0].publicationCount).toBe(140);
  });

  it("keeps the strongest grade for a pair", () => {
    const groups = groupReferences([
      rec({ fruit_vegetable: "apple", evidence_grade: "C" }),
      rec({ fruit_vegetable: "onion", evidence_grade: "A" }),
    ]);
    expect(groups[0].grade).toBe("A");
  });

  it("drops rows without citations", () => {
    const groups = groupReferences([
      rec({ sample_citations: [] }),
      rec({ gene_target: "IL6", sample_citations: ["PMID 999999"] }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].gene).toBe("IL6");
  });

  it("sorts strongest evidence first", () => {
    const groups = groupReferences([
      rec({ gene_target: "IL6", evidence_grade: "C", publication_count: 3 }),
      rec({ gene_target: "TNF", evidence_grade: "A", publication_count: 140 }),
      rec({ gene_target: "NFKB1", evidence_grade: "B", publication_count: 40 }),
    ]);
    expect(groups.map((g) => g.gene)).toEqual(["TNF", "NFKB1", "IL6"]);
  });

  it("attributes curated interactions to CTD", () => {
    expect(groupReferences([rec({})])[0].source).toBe("CTD Database");
  });
});

describe("totalPublicationCount", () => {
  it("counts each phytochemical–gene pair once", () => {
    const total = totalPublicationCount([
      rec({ fruit_vegetable: "apple", publication_count: 140 }),
      rec({ fruit_vegetable: "onion", publication_count: 140 }),
      rec({ gene_target: "IL6", publication_count: 20 }),
    ]);
    expect(total).toBe(160);
  });

  it("is zero for an empty set", () => {
    expect(totalPublicationCount([])).toBe(0);
  });
});

describe("uniquePmidCount", () => {
  it("counts distinct PMIDs across groups", () => {
    const groups = groupReferences([
      rec({ gene_target: "TNF", sample_citations: ["PMID 111111", "PMID 222222"] }),
      rec({ gene_target: "IL6", sample_citations: ["PMID 222222", "PMID 333333"] }),
    ]);
    expect(uniquePmidCount(groups)).toBe(3);
  });
});

describe("DATA_SOURCES", () => {
  it("names every database the analysis draws on", () => {
    expect(DATA_SOURCES).toContain("Comparative Toxicogenomics Database (CTD)");
    expect(DATA_SOURCES).toContain("Open Targets Platform");
    expect(DATA_SOURCES).toContain("KEGG Pathway Database");
    expect(DATA_SOURCES).toContain("PubMed / NCBI");
  });
});
