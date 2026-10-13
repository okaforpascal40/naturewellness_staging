import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Index from "@/pages/Index";
import { firstNameOf } from "@/lib/supabase";

const auth = vi.hoisted(() => ({
  state: { user: null as User | null, loading: false },
}));

vi.mock("@/lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase")>();
  return { ...actual, authEnabled: true, supabase: null, useUser: () => auth.state };
});

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, searchOpenTargetsDiseases: vi.fn().mockResolvedValue([]) };
});

const userWith = (over: { email?: string; meta?: Record<string, unknown> }) =>
  ({ id: "u1", email: over.email, user_metadata: over.meta ?? {} }) as unknown as User;

const renderIndex = () =>
  render(
    <MemoryRouter>
      <Index />
    </MemoryRouter>,
  );

beforeEach(() => {
  auth.state = { user: null, loading: false };
});

describe("home greeting", () => {
  it("greets a signed-out visitor as friend", () => {
    renderIndex();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, friend 👋");
    expect(screen.getByText("What would you like to explore today?")).toBeInTheDocument();
  });

  it("greets a Google user by first name only", () => {
    auth.state = { user: userWith({ email: "p@example.com", meta: { full_name: "Pascal Okafor" } }), loading: false };
    renderIndex();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Pascal 👋");
    expect(screen.getByText("What would you like to explore today, Pascal?")).toBeInTheDocument();
  });

  it("does not flash 'friend' while the session is loading", () => {
    auth.state = { user: null, loading: true };
    renderIndex();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Hello 👋");
    expect(heading).not.toHaveTextContent("friend");
  });
});

describe("firstNameOf", () => {
  it("takes the first word of the Google full name", () => {
    expect(firstNameOf(userWith({ meta: { full_name: "  Pascal   Okafor " } }))).toBe("Pascal");
  });

  it("falls back to the name claim, then the email's local part", () => {
    expect(firstNameOf(userWith({ meta: { name: "Ada Lovelace" } }))).toBe("Ada");
    expect(firstNameOf(userWith({ email: "sam@example.com" }))).toBe("sam");
  });

  it("returns null when there is nothing to greet by", () => {
    expect(firstNameOf(userWith({}))).toBeNull();
  });
});
