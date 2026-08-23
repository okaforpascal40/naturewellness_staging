import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PlantHealthPanel from "@/components/PlantHealthPanel";
import type { PlantCondition } from "@/lib/api";

const condition = (over: Partial<PlantCondition> = {}): PlantCondition => ({
  name: "Powdery mildew",
  probability: 0.85,
  is_harmful: true,
  description: "A fungal disease causing a white coating on leaves.",
  treatment: {
    biological: "Apply neem oil. Remove affected leaves.",
    chemical: "Apply a sulfur fungicide.",
    prevention: "Ensure good air circulation.",
  },
  url: "https://example.org/powdery-mildew",
  ...over,
});

describe("when no assessment is available", () => {
  it("says so rather than implying the plant is healthy", () => {
    render(
      <PlantHealthPanel isHealthy conditions={[]} available={false} />,
    );

    expect(screen.getByText(/No health assessment was returned/i)).toBeVisible();
    expect(screen.queryByText(/appears healthy/i)).toBeNull();
  });
});

describe("healthy plant", () => {
  it("shows the healthy banner with its confidence", () => {
    render(
      <PlantHealthPanel isHealthy healthProbability={0.97} conditions={[]} available />,
    );

    expect(screen.getByText("This plant appears healthy")).toBeVisible();
    expect(screen.getByText(/No signs of disease/i)).toBeVisible();
    expect(screen.getByText("97% confidence")).toBeVisible();
  });
});

describe("unhealthy plant", () => {
  it("warns and counts the conditions", () => {
    render(
      <PlantHealthPanel
        isHealthy={false}
        conditions={[condition(), condition({ name: "Leaf spot", probability: 0.6 })]}
        available
      />,
    );

    expect(screen.getByText("Health issues detected")).toBeVisible();
    expect(screen.getByText(/2 possible conditions/i)).toBeVisible();
  });

  it("renders the condition name, confidence and description", () => {
    render(<PlantHealthPanel isHealthy={false} conditions={[condition()]} available />);

    expect(screen.getByText("Powdery mildew")).toBeVisible();
    expect(screen.getByText(/85% · Likely/)).toBeVisible();
    expect(screen.getByText(/white coating on leaves/i)).toBeVisible();
  });

  it("keeps treatment collapsed until asked, then shows all three options", () => {
    render(<PlantHealthPanel isHealthy={false} conditions={[condition()]} available />);

    const toggle = screen.getByRole("button", { name: /Treatment options/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // The panel stays mounted so aria-controls always resolves; collapsed means
    // hidden, not absent, so assert on what the reader can actually see.
    expect(screen.getByText(/Apply neem oil/i)).not.toBeVisible();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Apply neem oil/i)).toBeVisible();
    expect(screen.getByText(/sulfur fungicide/i)).toBeVisible();
    expect(screen.getByText(/air circulation/i)).toBeVisible();
  });

  it("points aria-controls at a panel that exists", () => {
    render(<PlantHealthPanel isHealthy={false} conditions={[condition()]} available />);

    const toggle = screen.getByRole("button", { name: /Treatment options/i });
    const id = toggle.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).not.toBeNull();
  });

  it("links out to the source in a new tab, safely", () => {
    render(<PlantHealthPanel isHealthy={false} conditions={[condition()]} available />);

    const link = screen.getByRole("link", { name: /Learn more about Powdery mildew/i });
    expect(link).toHaveAttribute("href", "https://example.org/powdery-mildew");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("omits the treatment control when there is nothing to show", () => {
    render(
      <PlantHealthPanel
        isHealthy={false}
        conditions={[condition({ treatment: { biological: "", chemical: "", prevention: "" } })]}
        available
      />,
    );

    expect(screen.queryByRole("button", { name: /Treatment options/i })).toBeNull();
  });
});

describe("severity", () => {
  it.each([
    [0.9, "Likely"],
    [0.6, "Possible"],
    [0.2, "Low confidence"],
  ])("labels a %s-probability harmful condition as %s", (probability, label) => {
    render(
      <PlantHealthPanel
        isHealthy={false}
        conditions={[condition({ probability })]}
        available
      />,
    );

    expect(screen.getByText(new RegExp(label))).toBeVisible();
  });

  it("labels a non-harmful finding as not harmful whatever its confidence", () => {
    render(
      <PlantHealthPanel
        isHealthy
        conditions={[condition({ name: "Lichen cover", probability: 0.95, is_harmful: false })]}
        available
      />,
    );

    expect(screen.getByText(/95% · Not harmful/)).toBeVisible();
    // Only non-harmful findings — the plant is still presented as healthy.
    expect(screen.getByText("This plant appears healthy")).toBeVisible();
  });

  it("treats an unlabelled condition as harmful", () => {
    // The backend defaults is_harmful to true; the UI must not soften that.
    render(
      <PlantHealthPanel
        isHealthy={false}
        conditions={[{ name: "Unknown blight", probability: 0.9 }]}
        available
      />,
    );

    expect(screen.getByText("Health issues detected")).toBeVisible();
    expect(screen.getByText(/90% · Likely/)).toBeVisible();
  });

  it("does not claim health when a harmful condition is present", () => {
    // is_healthy can disagree with the suggestions; the caution wins.
    render(
      <PlantHealthPanel isHealthy conditions={[condition({ probability: 0.9 })]} available />,
    );

    expect(screen.getByText("Health issues detected")).toBeVisible();
  });
});

describe("disclaimer", () => {
  it("always tells the reader to confirm before treating a crop", () => {
    const { container } = render(
      <PlantHealthPanel isHealthy conditions={[]} available />,
    );

    expect(
      within(container).getByText(/Confirm with a local horticulturist/i),
    ).toBeVisible();
  });
});
