import { describe, expect, it } from "vitest";
import {
  keggPathwayId,
  keggPathwayUrl,
  reactomePathwayUrl,
  stringMultiNetworkUrl,
  stringNetworkUrl,
} from "@/lib/pathway-links";

describe("keggPathwayId", () => {
  it("finds a KEGG map id embedded in a pathway name", () => {
    expect(keggPathwayId("TNF signaling pathway (hsa04668)")).toBe("hsa04668");
    expect(keggPathwayId("map04668")).toBe("map04668");
  });

  it("returns null when the name carries no id", () => {
    expect(keggPathwayId("TNF signaling pathway")).toBeNull();
    expect(keggPathwayId("")).toBeNull();
  });
});

describe("keggPathwayUrl", () => {
  it("links straight to the diagram when an id is available", () => {
    expect(keggPathwayUrl("TNF signaling pathway (hsa04668)")).toBe(
      "https://www.kegg.jp/pathway/hsa04668",
    );
  });

  it("falls back to a KEGG pathway text search", () => {
    const url = keggPathwayUrl("TNF signaling pathway");
    expect(url).toContain("https://www.genome.jp/kegg-bin/search_pathway_text");
    expect(url).toContain("target=pathway");
    expect(url).toContain("viewImage=true");
  });

  it("encodes names that would otherwise break the query string", () => {
    const url = keggPathwayUrl("Glycolysis / Gluconeogenesis & PPP");
    expect(url).toContain("Glycolysis+%2F+Gluconeogenesis+%26+PPP");
    // The separators must not survive raw, or they terminate the parameter.
    expect(url.split("?")[1]).not.toContain(" / ");
  });
});

describe("reactomePathwayUrl", () => {
  it("searches Reactome restricted to pathways", () => {
    const url = reactomePathwayUrl("Signaling by Interleukins");
    expect(url).toContain("https://reactome.org/content/query");
    expect(url).toContain("types=Pathway");
    expect(url).toContain("Signaling+by+Interleukins");
  });
});

describe("stringNetworkUrl", () => {
  it("searches STRING by symbol and species rather than guessing an id", () => {
    const url = stringNetworkUrl("TNF");
    expect(url).toContain("https://string-db.org/cgi/network");
    expect(url).toContain("identifiers=TNF");
    expect(url).toContain("species=9606");
  });

  it("degrades to the bare network page for an empty gene", () => {
    expect(stringNetworkUrl("")).toBe("https://string-db.org/network");
  });
});

describe("stringMultiNetworkUrl", () => {
  it("sends several genes so the view shows their interactions", () => {
    const url = stringMultiNetworkUrl(["TNF", "IL6", "NFKB1"]);
    expect(url).toContain("identifiers=TNF%0DIL6%0DNFKB1");
    expect(url).toContain("species=9606");
  });

  it("drops blanks and caps the list", () => {
    const many = Array.from({ length: 20 }, (_, i) => `GENE${i}`);
    const url = stringMultiNetworkUrl(["", "  ", ...many]);
    expect(url).toContain("GENE0");
    expect(url).not.toContain("GENE12");
  });

  it("uses the single-gene form for one gene", () => {
    expect(stringMultiNetworkUrl(["TNF"])).toBe(stringNetworkUrl("TNF"));
  });

  it("degrades to the bare network page for no genes", () => {
    expect(stringMultiNetworkUrl([])).toBe("https://string-db.org/network");
  });
});

describe("all links", () => {
  it("only ever produce https URLs", () => {
    const urls = [
      keggPathwayUrl("TNF signaling pathway"),
      keggPathwayUrl("x (hsa04668)"),
      reactomePathwayUrl("Interleukins"),
      stringNetworkUrl("TNF"),
      stringMultiNetworkUrl(["TNF", "IL6"]),
    ];
    for (const url of urls) expect(url).toMatch(/^https:\/\//);
  });
});
