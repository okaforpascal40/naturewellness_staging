import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type PlantSearchResponse } from "@/lib/api";
import PremiumLoader from "@/components/PremiumLoader";
import PlantResults from "@/pages/PlantResults";

const searchPlant = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, searchPlant };
});

const RESPONSE: PlantSearchResponse = {
  plant_name: "Turmeric",
  scientific_name: "Curcuma longa",
  phytochemicals: ["Curcumin", "Turmerone"],
  nutrient_content: null,
  conditions_with_evidence: [
    {
      condition_name: "type 2 diabetes mellitus",
      condition_id: "MONDO_0005148",
      gene_targets: ["TNF", "PPARG"],
      evidence_grade: "A",
      publication_count: 140,
      interaction_type: "decreases expression",
      sample_citations: ["PMID 12345678", "PMID 23456789"],
    },
    {
      condition_name: "liver fibrosis",
      condition_id: null,
      gene_targets: ["TGFB1"],
      evidence_grade: "C",
      publication_count: 3,
      interaction_type: "affects activity",
      sample_citations: [],
    },
  ],
  total_conditions: 12,
  total_publications: 431,
  recommendation_source: "academic_literature",
};

const Location = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
};

const renderPage = (path = "/plant/Turmeric") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/plant/:plantName" element={<PlantResults />} />
          <Route path="/conditions/:id" element={<Location />} />
          <Route path="/" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  searchPlant.mockReset();
  searchPlant.mockResolvedValue(RESPONSE);
});

describe("plant results", () => {
  it("searches for the decoded plant name from the URL", async () => {
    renderPage("/plant/Green%20Tea");
    await screen.findByRole("heading", { name: "Turmeric", level: 1 });
    expect(searchPlant).toHaveBeenCalledWith("Green Tea", expect.any(AbortSignal));
  });

  it("renders the plant, its phytochemicals and graded conditions", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Turmeric", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Curcuma longa")).toBeInTheDocument();
    expect(screen.getByText("Curcumin")).toBeInTheDocument();
    expect(screen.getByText("Grade A")).toBeInTheDocument();
    expect(screen.getByText("Grade C")).toBeInTheDocument();
    expect(screen.getByText("140 publications")).toBeInTheDocument();
    expect(screen.getByText("PPARG")).toBeInTheDocument();
    expect(screen.getByText("431")).toBeInTheDocument();

    const pubmed = screen.getByRole("link", { name: /PMID 12345678/ });
    expect(pubmed).toHaveAttribute("href", "https://pubmed.ncbi.nlm.nih.gov/12345678/");
    expect(pubmed).toHaveAttribute("target", "_blank");
  });

  it("renders nothing for a missing nutrient note", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Turmeric", level: 1 });
    expect(screen.queryByText(/nutrient/i)).not.toBeInTheDocument();
  });

  it("links conditions with an id to their results page, and leaves the rest as text", async () => {
    renderPage();
    const link = await screen.findByRole("link", { name: "type 2 diabetes mellitus" });
    expect(link).toHaveAttribute(
      "href",
      "/conditions/MONDO_0005148?name=type%202%20diabetes%20mellitus",
    );
    expect(screen.getAllByRole("link", { name: /explore this condition/i })).toHaveLength(1);

    const fibrosis = screen.getByRole("heading", { name: "liver fibrosis" });
    expect(within(fibrosis).queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows a friendly message for a plant not in the database", async () => {
    searchPlant.mockRejectedValue(new ApiError(404, "not found"));
    renderPage("/plant/Pawpaw");

    expect(await screen.findByText(/we couldn't find/i)).toHaveTextContent(
      "We couldn't find Pawpaw in our database",
    );
    expect(screen.getByRole("button", { name: /back to search/i })).toBeInTheDocument();
    // A 404 won't change on retry.
    expect(searchPlant).toHaveBeenCalledTimes(1);
  });

  it("offers Try Again for other failures", async () => {
    searchPlant.mockRejectedValue(new Error("Network down"));
    renderPage();

    expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByText("Network down")).toBeInTheDocument();
  });
});

describe("plant loader copy", () => {
  it("narrates the lookup with the messages it is given", () => {
    render(<PremiumLoader visible messages={["🌿 One", "🧬 Two"]} />);
    expect(screen.getByRole("status")).toHaveTextContent("🌿 One");
  });
});
