import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AutomationRunResponse } from "@/lib/api";
import { FROM_SEARCH_STATE } from "@/lib/condition-nav";
import Index from "@/pages/Index";
import Recommendations from "@/pages/Recommendations";

/**
 * The full-screen PremiumLoader belongs to a lookup the user just asked for.
 * Opening the app (on "/" or cold on a results URL) must never show it.
 */
const runAutomation = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai-summary", () => ({
  generateHealthSummary: vi.fn().mockRejectedValue(new Error("stubbed")),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, runAutomation, searchOpenTargetsDiseases: vi.fn().mockResolvedValue([]) };
});

const RESPONSE: AutomationRunResponse = {
  genes_found: 1,
  pathways_found: 1,
  compounds_found: 1,
  foods_found: 1,
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
      sample_citations: ["PMID 12345678"],
    },
  ],
};

/** A promise the test resolves or rejects when it chooses. */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location-state">{JSON.stringify(location.state)}</output>;
};

const renderAt = (entry: string | { pathname: string; state: unknown }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/conditions/:id"
            element={
              <>
                <Recommendations />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const PATH = "/conditions/type-2-diabetes";

/** The suite runs in parallel with heavier files, so allow for a slow worker. */
const SLOW = { timeout: 5000 };

beforeEach(() => {
  runAutomation.mockReset();
  localStorage.clear();
});

describe("PremiumLoader visibility", { timeout: 20000 }, () => {
  it("never shows on the home page", () => {
    renderAt("/");
    expect(screen.queryByTestId("premium-loader")).not.toBeInTheDocument();
    expect(runAutomation).not.toHaveBeenCalled();
  });

  it("shows an inline loader, not the overlay, on a cold open of a results URL", async () => {
    const pending = deferred<AutomationRunResponse>();
    runAutomation.mockReturnValue(pending.promise);
    renderAt(PATH);

    const status = await screen.findByTestId("inline-loader", {}, SLOW);
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent(/loading evidence for/i);
    expect(screen.queryByTestId("premium-loader")).not.toBeInTheDocument();

    pending.resolve(RESPONSE);
    await waitFor(() => expect(screen.queryByTestId("inline-loader")).not.toBeInTheDocument(), SLOW);
    expect(screen.queryByTestId("premium-loader")).not.toBeInTheDocument();
  });

  it("shows the overlay after an in-app selection and removes it once results arrive", async () => {
    const pending = deferred<AutomationRunResponse>();
    runAutomation.mockReturnValue(pending.promise);
    renderAt({ pathname: PATH, state: FROM_SEARCH_STATE });

    expect(await screen.findByTestId("premium-loader", {}, SLOW)).toBeInTheDocument();
    expect(screen.queryByTestId("inline-loader")).not.toBeInTheDocument();

    // The marker is consumed so a reload or Back/Forward can't replay the overlay,
    // and consuming it doesn't hide the overlay mid-lookup.
    await waitFor(() => expect(screen.getByTestId("location-state")).toHaveTextContent("null"), SLOW);
    expect(screen.getByTestId("premium-loader")).toBeInTheDocument();

    pending.resolve(RESPONSE);
    // Fades out (FADE_MS) after the data lands, then unmounts.
    await waitFor(() => expect(screen.queryByTestId("premium-loader")).not.toBeInTheDocument(), SLOW);
    expect(screen.getByRole("tab", { name: "Summary" })).toBeInTheDocument();
  });

  it("shows the overlay when Try Again is pressed after an error", async () => {
    // The page retries once (about a second later) before surfacing the error.
    runAutomation.mockRejectedValue(new Error("backend down"));
    renderAt(PATH);

    const retry = await screen.findByRole("button", { name: /try again/i }, { timeout: 5000 });
    expect(screen.queryByTestId("premium-loader")).not.toBeInTheDocument();

    const pending = deferred<AutomationRunResponse>();
    runAutomation.mockReturnValue(pending.promise);
    fireEvent.click(retry);

    expect(await screen.findByTestId("premium-loader", {}, SLOW)).toBeInTheDocument();
    expect(screen.queryByTestId("inline-loader")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();

    pending.resolve(RESPONSE);
    await waitFor(() => expect(screen.queryByTestId("premium-loader")).not.toBeInTheDocument(), SLOW);
  });
});
