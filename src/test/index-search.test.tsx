import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Index from "@/pages/Index";

const searchOpenTargetsDiseases = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, searchOpenTargetsDiseases };
});

const DIABETES = {
  id: "MONDO_0005148",
  name: "type 2 diabetes mellitus",
  description: "A metabolic disease.",
};

const Results = () => {
  const location = useLocation();
  return (
    <>
      <div data-testid="results">{location.pathname + location.search}</div>
      <output data-testid="results-state">{JSON.stringify(location.state)}</output>
    </>
  );
};

const renderIndex = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/conditions/:id" element={<Results />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  searchOpenTargetsDiseases.mockReset();
  searchOpenTargetsDiseases.mockResolvedValue([DIABETES]);
});

const typeQuery = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText(/type a disease/i), { target: { value: text } });

describe("disease search on the home page", () => {
  it("navigates to results as soon as a suggestion is picked", async () => {
    renderIndex();
    typeQuery("diab");

    fireEvent.click(await screen.findByText(DIABETES.name));

    expect(screen.getByTestId("results")).toHaveTextContent(
      `/conditions/${DIABETES.id}?name=type%202%20diabetes%20mellitus`,
    );
    // Marks the visit as user-initiated so the results page shows its full-screen loader.
    expect(screen.getByTestId("results-state")).toHaveTextContent('{"fromSearch":true}');
  });

  it("offers Get Recommendations only once something is typed", async () => {
    renderIndex();
    expect(screen.queryByRole("button", { name: /get recommendations/i })).not.toBeInTheDocument();

    typeQuery("diab");
    expect(screen.getByRole("button", { name: /get recommendations/i })).toBeInTheDocument();
  });

  it("never navigates to a previous query's match while the new one is pending", async () => {
    renderIndex();
    typeQuery("diab");
    await screen.findByText(DIABETES.name);

    // The next lookup hangs, so only stale results could be used.
    searchOpenTargetsDiseases.mockReturnValue(new Promise(() => {}));
    typeQuery("asthma");
    fireEvent.click(screen.getByRole("button", { name: /get recommendations/i }));

    expect(screen.queryByTestId("results")).not.toBeInTheDocument();
    expect(screen.queryByText(DIABETES.name)).not.toBeInTheDocument();
  });

  it("Get Recommendations goes to the top match for what was typed", async () => {
    renderIndex();
    typeQuery("diab");
    // Wait for suggestions to settle so the button has a match to use.
    await screen.findByText(DIABETES.name);

    fireEvent.click(screen.getByRole("button", { name: /get recommendations/i }));

    expect(screen.getByTestId("results")).toHaveTextContent(`/conditions/${DIABETES.id}`);
    expect(screen.getByTestId("results-state")).toHaveTextContent('{"fromSearch":true}');
  });
});
