import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "@/pages/Profile";

const auth = vi.hoisted(() => ({
  state: { user: null as User | null, loading: false },
}));

vi.mock("@/lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase")>();
  return { ...actual, authEnabled: true, supabase: null, useUser: () => auth.state };
});

vi.mock("@/lib/user-sync", () => ({ startUserSync: vi.fn() }));

const GOOGLE_USER = {
  id: "u1",
  email: "ada@example.com",
  user_metadata: { full_name: "Ada Lovelace" },
} as unknown as User;

const renderProfile = () =>
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("nw_profile", JSON.stringify({ name: "Local Name", email: "local@example.com" }));
  auth.state = { user: null, loading: false };
});

describe("Profile identity", () => {
  it("shows neither identity while the session is still loading", () => {
    auth.state = { user: null, loading: true };
    renderProfile();
    expect(screen.queryByDisplayValue("Local Name")).not.toBeInTheDocument();
    expect(screen.queryByText("Local Name")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter your name")).not.toBeInTheDocument();
  });

  it("shows read-only Google details when signed in", () => {
    auth.state = { user: GOOGLE_USER, loading: false };
    renderProfile();
    expect(screen.getByDisplayValue("Ada Lovelace")).toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("ada@example.com")).toHaveAttribute("readonly");
    expect(screen.getByText("Managed by your Google account")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Local Name")).not.toBeInTheDocument();
  });

  it("keeps the editable local fields when signed out", () => {
    renderProfile();
    expect(screen.getByDisplayValue("Local Name")).not.toHaveAttribute("readonly");
  });
});
