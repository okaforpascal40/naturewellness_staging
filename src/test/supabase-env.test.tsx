import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Missing auth env vars must disable sign-in, not crash the app at import.
beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
  vi.resetModules();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("auth client without env vars", () => {
  it("exports a null client and authEnabled=false", async () => {
    const mod = await import("@/lib/supabase");
    expect(mod.authEnabled).toBe(false);
    expect(mod.supabase).toBeNull();
    await expect(mod.signInWithGoogle()).rejects.toThrow(/not configured/);
    await expect(mod.signOut()).resolves.toBeUndefined();
  });

  it("lets the app and its auth consumers import, and AuthButton renders nothing", async () => {
    await expect(import("@/App")).resolves.toBeDefined();
    await expect(import("@/lib/user-sync")).resolves.toBeDefined();
    const { default: AuthButton } = await import("@/components/AuthButton");
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  }, 60_000); // transforming the whole App graph is slow on a cold cache

  it("makes data reads fail through requireSupabase rather than at import", async () => {
    const mod = await import("@/lib/supabase");
    expect(() => mod.requireSupabase()).toThrow(/not configured/);
  });

  it("builds one client from the env vars when they are set", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example-project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
    const mod = await import("@/lib/supabase");
    expect(mod.authEnabled).toBe(true);
    expect(mod.requireSupabase()).toBe(mod.supabase);
  });
});
