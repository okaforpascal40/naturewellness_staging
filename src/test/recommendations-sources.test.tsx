import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AutomationRunResponse } from "@/lib/api";

/**
 * DOM-level cover for the scientific-source surfaces the reviewing scientist
 * has to find: the Summary tab's evidence banner, the collapsible per-food
 * sources, and the References tab's citation cards.
 */
const runAutomation = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, runAutomation };
});

const RESPONSE: AutomationRunResponse = {
  genes_found: 2,
  pathways_found: 2,
  compounds_found: 2,
  foods_found: 2,
  status: "ok",
  recommendations: [
    {
      fruit_vegetable: "turmeric",
      phytochemical: "Curcumin",
      gene_target: "TNF",
      pathway: "TNF signaling pathway",
      evidence_grade: "A",
      publication_count: 140,
      interaction_type: "decreases expression",
      sample_citations: ["PMID 12345678", "PMID 23456789"],
    },
    {
      // Same pair reached through a second food: one reference entry, not two,
      // and the 140 publications must not be double-counted.
      fruit_vegetable: "ginger",
      phytochemical: "Curcumin",
      gene_target: "TNF",
      pathway: "TNF signaling pathway",
      evidence_grade: "A",
      publication_count: 140,
      interaction_type: "decreases expression",
      sample_citations: ["PMID 12345678"],
    },
    {
      fruit_vegetable: "grape",
      phytochemical: "Resveratrol",
      gene_target: "SIRT1",
      pathway: "Longevity regulating pathway",
      evidence_grade: "B",
      publication_count: 60,
      interaction_type: "increases activity",
      sample_citations: ["PMID 34567890"],
    },
  ],
};

/** Radix tab triggers select on mousedown, not on a synthetic click. */
const selectTab = (name: string) => {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
};

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { default: Recommendations } = await import("@/pages/Recommendations");
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/recommendations/type-2-diabetes"]}>
        <Routes>
          <Route path="/recommendations/:id" element={<Recommendations />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByRole("tab", { name: "References" })).toBeVisible());
};

beforeEach(() => {
  runAutomation.mockResolvedValue(RESPONSE);
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Summary tab evidence sources", () => {
  it("names every database and the publication total", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: /Evidence Sources/i })).toBeVisible();
    for (const db of [
      "Comparative Toxicogenomics Database (CTD)",
      "Open Targets Platform",
      "KEGG Pathway Database",
      "PubMed / NCBI",
    ]) {
      expect(screen.getByText(db)).toBeVisible();
    }
    // 140 (Curcumin/TNF, counted once across two foods) + 60 (Resveratrol/SIRT1).
    const banner = screen.getByRole("region", { name: /Evidence Sources/i });
    expect(within(banner).getByText("200")).toBeVisible();
  }, 20000);

  it("jumps to the References tab from the banner button", async () => {
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: /View All References/i }));

    expect(await screen.findByRole("heading", { name: /Scientific References/i })).toBeVisible();
  });

  it("hands keyboard focus to the References tab instead of dropping it", async () => {
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: /View All References/i }));

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("tab", { name: "References" })),
    );
  });
});

describe("References tab", () => {
  it("shows one card per phytochemical–gene pair with working PubMed links", async () => {
    await renderPage();
    selectTab("References");

    const entries = await screen.findAllByRole("listitem");
    const curcumin = entries.find((el) => el.textContent?.includes("Curcumin"));
    expect(curcumin).toBeDefined();

    const card = within(curcumin!);
    expect(card.getByText("TNF")).toBeVisible();
    expect(card.getByText(/140 publications/)).toBeVisible();
    expect(card.getByText(/decreases expression/)).toBeVisible();
    expect(card.getByText(/Source: CTD Database/)).toBeVisible();
    expect(card.getByText("Mechanistic Study")).toBeVisible();
    expect(card.getByText(/Found in: turmeric, ginger/)).toBeVisible();

    const link = card.getByRole("link", { name: /PubMed: 12345678/ });
    expect(link).toHaveAttribute("href", "https://pubmed.ncbi.nlm.nih.gov/12345678/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");

    // The pair repeated across two foods must not produce a second entry.
    expect(entries.filter((el) => el.textContent?.includes("Curcumin"))).toHaveLength(1);
  });

  it("tells the reader the references are clickable", async () => {
    await renderPage();
    selectTab("References");

    expect(
      await screen.findByText(/Click any PubMed reference to read the original publication/i),
    ).toBeVisible();
    expect(
      screen.getByText(/CTD Database • Open Targets • KEGG Pathways/),
    ).toBeVisible();
  });
});

describe("Food cards", () => {
  it("expands and collapses that food's PubMed sources", async () => {
    await renderPage();
    selectTab("Foods & Nutrients");

    const toggle = (await screen.findAllByRole("button", { name: /2 sources/ }))[0];
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /PubMed: 23456789/ })).toBeNull();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const link = await screen.findByRole("link", { name: /PubMed: 23456789/ });
    expect(link).toHaveAttribute("href", "https://pubmed.ncbi.nlm.nih.gov/23456789/");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: /PubMed: 23456789/ })).toBeNull(),
    );
  });

  it("points aria-controls at the panel it actually opens", async () => {
    await renderPage();
    selectTab("Foods & Nutrients");

    const toggles = await screen.findAllByRole("button", { name: /source/ });
    const ids = toggles.map((t) => t.getAttribute("aria-controls"));
    expect(new Set(ids).size).toBe(ids.length); // every id unique

    fireEvent.click(toggles[0]);
    expect(document.getElementById(ids[0]!)).not.toBeNull();
  });
});
