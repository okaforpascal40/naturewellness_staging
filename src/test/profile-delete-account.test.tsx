import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "@/pages/Profile";

const auth = vi.hoisted(() => ({
  state: { user: null as unknown, loading: false },
  invoke: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase")>();
  return {
    ...actual,
    authEnabled: true,
    supabase: { functions: { invoke: auth.invoke }, auth: { signOut: auth.signOut } },
    useUser: () => auth.state,
  };
});

vi.mock("@/lib/user-sync", () => ({ startUserSync: vi.fn() }));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), toast) }));

const GOOGLE_USER = {
  id: "u1",
  email: "ada@example.com",
  user_metadata: { full_name: "Ada Lovelace" },
} as unknown as User;

const renderProfile = () =>
  render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<Profile />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const confirmDeletion = () => {
  fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
  expect(screen.getByText("Delete your account?")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
};

beforeEach(() => {
  localStorage.clear();
  auth.state = { user: null, loading: false };
  auth.invoke.mockReset();
  auth.signOut.mockReset().mockResolvedValue({ error: null });
  toast.success.mockReset();
  toast.error.mockReset();
});

describe("Profile account deletion", () => {
  it("hides the delete button when signed out", () => {
    renderProfile();
    expect(screen.queryByRole("button", { name: "Delete my account" })).not.toBeInTheDocument();
    // One link beside the sign-in button, one in the App card.
    expect(screen.getAllByRole("link", { name: "Privacy Policy" })).toHaveLength(2);
  });

  it("shows the delete button when signed in", () => {
    auth.state = { user: GOOGLE_USER, loading: false };
    renderProfile();
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeInTheDocument();
  });

  it("deletes, signs out, clears nw_ keys and goes home on success", async () => {
    auth.state = { user: GOOGLE_USER, loading: false };
    auth.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    localStorage.setItem("nw_history", "[]");
    localStorage.setItem("nw_profile", "{}");
    localStorage.setItem("other_key", "keep");
    renderProfile();
    confirmDeletion();

    await screen.findByText("Home page");
    expect(auth.invoke).toHaveBeenCalledWith("delete-account");
    expect(auth.signOut).toHaveBeenCalled();
    expect(localStorage.getItem("nw_history")).toBeNull();
    expect(localStorage.getItem("nw_profile")).toBeNull();
    expect(localStorage.getItem("other_key")).toBe("keep");
    expect(toast.success).toHaveBeenCalledWith("Your account has been deleted");
  });

  it("keeps the user signed in and shows an error when deletion fails", async () => {
    auth.state = { user: GOOGLE_USER, loading: false };
    auth.invoke.mockResolvedValue({ data: null, error: new Error("boom") });
    localStorage.setItem("nw_history", "[]");
    renderProfile();
    confirmDeletion();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem("nw_history")).toBe("[]");
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete my account" })).not.toBeDisabled();
  });
});
