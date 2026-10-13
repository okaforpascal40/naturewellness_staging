import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PremiumLoader from "@/components/PremiumLoader";
import {
  FADE_MS,
  MESSAGE_INTERVAL_MS,
  STATUS_MESSAGES,
  messageIndex,
} from "@/lib/premium-loader";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("status messages", () => {
  it("starts on the first message and changes every 3 seconds", () => {
    render(<PremiumLoader visible />);
    expect(screen.getByText(STATUS_MESSAGES[0])).toBeInTheDocument();

    advance(MESSAGE_INTERVAL_MS);
    expect(screen.getByText(STATUS_MESSAGES[1])).toBeInTheDocument();
    expect(screen.queryByText(STATUS_MESSAGES[0])).not.toBeInTheDocument();
  });

  it("keeps cycling for lookups that outlast one pass through the messages", () => {
    render(<PremiumLoader visible />);
    advance(MESSAGE_INTERVAL_MS * (STATUS_MESSAGES.length + 1));
    expect(screen.getByText(STATUS_MESSAGES[1])).toBeInTheDocument();
  });

  it("maps elapsed time to a wrapping message index", () => {
    expect(messageIndex(0)).toBe(0);
    expect(messageIndex(MESSAGE_INTERVAL_MS - 1)).toBe(0);
    expect(messageIndex(MESSAGE_INTERVAL_MS)).toBe(1);
    expect(messageIndex(MESSAGE_INTERVAL_MS * STATUS_MESSAGES.length)).toBe(0);
  });
});

describe("spinning ring", () => {
  it("spins an arc covering a third of the circle", () => {
    render(<PremiumLoader visible />);
    const ring = screen.getByTestId("premium-loader-ring");
    expect(ring).toHaveClass("motion-safe:animate-ring-spin");

    const [arc, gap] = ring
      .querySelector("circle[stroke-dasharray]")!
      .getAttribute("stroke-dasharray")!
      .split(" ")
      .map(Number);
    expect(arc / gap).toBeCloseTo(1 / 3);
  });
});

describe("visibility", () => {
  it("renders nothing when not visible", () => {
    render(<PremiumLoader visible={false} />);
    expect(screen.queryByTestId("premium-loader")).not.toBeInTheDocument();
  });

  it("fades in, then fades out before unmounting and restores the page", () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
    try {
      const { rerender } = render(<PremiumLoader visible />, { container: root });
      expect(screen.getByTestId("premium-loader")).toHaveClass("fade-in");
      expect(document.body.style.overflow).toBe("hidden");
      // The page behind the overlay is out of reach; the overlay itself is not.
      expect(root.inert).toBe(true);
      expect(root).not.toContainElement(screen.getByTestId("premium-loader"));

      rerender(<PremiumLoader visible={false} />);
      // Still on screen while the fade-out plays.
      expect(screen.getByTestId("premium-loader")).toHaveClass("fade-out");

      advance(FADE_MS);
      expect(screen.queryByTestId("premium-loader")).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe("");
      expect(root.inert).toBe(false);
    } finally {
      root.remove();
    }
  });

  it("announces status changes through a live region that is not marked busy", () => {
    render(<PremiumLoader visible />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).not.toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent(STATUS_MESSAGES[0]);
  });

  it("shows the footnote", () => {
    render(<PremiumLoader visible />);
    expect(screen.getByText("Analyzing peer-reviewed literature")).toBeInTheDocument();
  });
});

describe("brand mark", () => {
  it("draws the favicon leaf, not the old gradient leaf", () => {
    const favicon = readFileSync(resolve(__dirname, "../../public/favicon.svg"), "utf8");
    const faviconPaths = [...favicon.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
    render(<PremiumLoader visible />);

    const loader = screen.getByTestId("premium-loader");
    const paths = [...loader.querySelectorAll("path")].map((el) => el.getAttribute("d"));
    expect(faviconPaths.length).toBeGreaterThan(0);
    for (const d of faviconPaths) expect(paths).toContain(d);
    expect(loader.querySelector("#premium-loader-leaf")).toBeNull();
  });
});
