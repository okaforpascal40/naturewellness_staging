import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Index from "@/pages/Index";

const searchOpenTargetsDiseases = vi.hoisted(() => vi.fn());
const getPlantSuggestions = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, searchOpenTargetsDiseases, getPlantSuggestions };
});

const Location = () => {
  const location = useLocation();
  return <div data-testid="results">{location.pathname + location.search}</div>;
};

const renderIndex = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/plant/:plantName" element={<Location />} />
        <Route path="/conditions/:id" element={<Location />} />
      </Routes>
    </MemoryRouter>,
  );

const plantMode = () => fireEvent.click(screen.getByRole("button", { name: /find by plant/i }));
const conditionMode = () => fireEvent.click(screen.getByRole("button", { name: /find by condition/i }));
const typePlant = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText(/type a fruit, vegetable or plant/i), {
    target: { value: text },
  });

beforeEach(() => {
  searchOpenTargetsDiseases.mockReset();
  searchOpenTargetsDiseases.mockResolvedValue([]);
  getPlantSuggestions.mockReset();
  getPlantSuggestions.mockResolvedValue(["Turmeric Root", "Turnip"]);
});

describe("search mode toggle", () => {
  it("starts in condition mode and marks the pressed segment", () => {
    renderIndex();
    expect(screen.getByRole("button", { name: /find by condition/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /find by plant/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByPlaceholderText(/type a disease/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Disease" })).toBeInTheDocument();
  });

  it("swaps placeholder, chips and tabs in plant mode", () => {
    renderIndex();
    plantMode();

    expect(screen.getByRole("button", { name: /find by plant/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByPlaceholderText(/type a fruit, vegetable or plant/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Moringa" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Type 2 Diabetes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Disease" })).not.toBeInTheDocument();
  });

  it("clears the query when switching modes", () => {
    renderIndex();
    fireEvent.change(screen.getByPlaceholderText(/type a disease/i), { target: { value: "asthma" } });
    plantMode();
    expect(screen.getByPlaceholderText(/type a fruit/i)).toHaveValue("");

    typePlant("garlic");
    conditionMode();
    expect(screen.getByPlaceholderText(/type a disease/i)).toHaveValue("");
  });
});

describe("plant search", () => {
  it("navigates straight to the plant page from a chip", () => {
    renderIndex();
    plantMode();
    fireEvent.click(screen.getByRole("button", { name: "Green Tea" }));
    expect(screen.getByTestId("results")).toHaveTextContent("/plant/Green%20Tea");
  });

  it("navigates when a suggestion is picked", async () => {
    renderIndex();
    plantMode();
    typePlant("tur");

    fireEvent.click(await screen.findByRole("button", { name: "Turnip" }));
    expect(screen.getByTestId("results")).toHaveTextContent("/plant/Turnip");
    expect(getPlantSuggestions).toHaveBeenCalledWith("tur", expect.any(AbortSignal));
    expect(searchOpenTargetsDiseases).not.toHaveBeenCalled();
  });

  it("Enter goes to the top suggestion once it has loaded", async () => {
    renderIndex();
    plantMode();
    typePlant("tur");
    await screen.findByRole("button", { name: "Turmeric Root" });

    fireEvent.keyDown(screen.getByPlaceholderText(/type a fruit/i), { key: "Enter" });
    expect(screen.getByTestId("results")).toHaveTextContent("/plant/Turmeric%20Root");
  });

  it("falls back to the typed name when nothing matches", async () => {
    getPlantSuggestions.mockResolvedValue([]);
    renderIndex();
    plantMode();
    typePlant("pawpaw");
    await screen.findByText(/no matching plants/i);

    fireEvent.click(screen.getByRole("button", { name: /explore health benefits/i }));
    expect(screen.getByTestId("results")).toHaveTextContent("/plant/pawpaw");
  });

  it("never navigates to a previous query's suggestion while the new one is pending", async () => {
    renderIndex();
    plantMode();
    typePlant("tur");
    await screen.findByRole("button", { name: "Turmeric Root" });

    getPlantSuggestions.mockReturnValue(new Promise(() => {}));
    typePlant("garl");
    fireEvent.click(screen.getByRole("button", { name: /explore health benefits/i }));

    expect(screen.queryByTestId("results")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Turmeric Root" })).not.toBeInTheDocument();
  });
});
