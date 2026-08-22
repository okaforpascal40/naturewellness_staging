import { describe, expect, it } from "vitest";
import { getFoodImage, hasFoodImage } from "@/lib/food-images";

describe("getFoodImage", () => {
  it("returns a sized Unsplash URL for a curated food", () => {
    const url = getFoodImage("Turmeric");
    expect(url).toContain("images.unsplash.com");
    expect(url).toContain("w=200");
  });

  it("matches case-insensitively", () => {
    expect(getFoodImage("turmeric")).toBe(getFoodImage("Turmeric"));
    expect(getFoodImage("BLUEBERRY")).toBe(getFoodImage("Blueberry"));
  });

  it("matches when the API name is a variant of the key", () => {
    // The backend returns plurals and qualified names.
    expect(getFoodImage("grapes")).toBe(getFoodImage("Grape"));
    expect(getFoodImage("red onion")).toBe(getFoodImage("Onion"));
  });

  it("prefers the longer key so multi-word foods are not shadowed", () => {
    // "Green Tea" must not resolve through a bare "Tea"-style partial match.
    expect(getFoodImage("Green Tea")).toContain("photo-1556679343-c7306c1976bc");
  });

  it("returns null for foods with no curated photo", () => {
    expect(getFoodImage("Rambutan")).toBeNull();
    expect(getFoodImage("")).toBeNull();
    expect(getFoodImage("   ")).toBeNull();
  });

  it("only ever returns https URLs", () => {
    for (const name of ["Turmeric", "Kale", "Grape", "Olive"]) {
      expect(getFoodImage(name)).toMatch(/^https:\/\//);
    }
  });
});

describe("hasFoodImage", () => {
  it("agrees with getFoodImage", () => {
    expect(hasFoodImage("Apple")).toBe(true);
    expect(hasFoodImage("Rambutan")).toBe(false);
  });
});

/**
 * Network-backed guard. Unsplash ids rot — seven of the twenty this map was
 * first written with were already dead — and a rotted entry degrades silently
 * to the emoji, so nothing else would catch it. Opt-in via CHECK_IMAGE_URLS=1
 * to keep the default suite offline and fast.
 */
const online = process.env.CHECK_IMAGE_URLS === "1";

describe.runIf(online)("curated image URLs are reachable", () => {
  const names = [
    "Turmeric", "Blueberry", "Grape", "Broccoli", "Onion", "Kale", "Apple",
    "Green Tea", "Strawberry", "Ginger", "Spinach", "Tomato", "Avocado", "Olive",
  ];

  it.each(names)("%s resolves on the Unsplash CDN", async (name) => {
    const url = getFoodImage(name);
    expect(url).not.toBeNull();
    const response = await fetch(url!, { headers: { Range: "bytes=0-0" } });
    expect(
      response.ok || response.status === 206,
      `${name} -> HTTP ${response.status}`,
    ).toBe(true);
  }, 30000);
});
