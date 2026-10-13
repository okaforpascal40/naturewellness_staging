import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE, ApiError, getPlantSuggestions, searchPlant } from "@/lib/api";

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );

afterEach(() => vi.restoreAllMocks());

describe("searchPlant", () => {
  it("posts the plant name to the search endpoint", async () => {
    const fetchSpy = respond(200, { plant_name: "Turmeric" });
    await expect(searchPlant("Turmeric")).resolves.toMatchObject({ plant_name: "Turmeric" });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/plant/search`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ plant_name: "Turmeric" });
  });

  it("rejects with the status so a 404 can be told apart", async () => {
    respond(404, { detail: "Plant not found" });
    const err = await searchPlant("Pawpaw").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
  });
});

describe("getPlantSuggestions", () => {
  it("skips the request for queries under two characters", async () => {
    const fetchSpy = respond(200, ["Turmeric"]);
    await expect(getPlantSuggestions(" t ")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("encodes the query and keeps only string names", async () => {
    const fetchSpy = respond(200, ["Green Tea", 42, null]);
    await expect(getPlantSuggestions("green t")).resolves.toEqual(["Green Tea"]);
    expect(fetchSpy.mock.calls[0][0]).toBe(`${API_BASE}/api/v1/plant/suggestions?q=green%20t`);
  });
});
