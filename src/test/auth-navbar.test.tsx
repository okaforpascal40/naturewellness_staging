import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "@/components/Navbar";
import AuthButton from "@/components/AuthButton";

const auth = vi.hoisted(() => ({
  state: { user: null as User | null, loading: false },
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase")>();
  return {
    ...actual,
    authEnabled: true,
    supabase: null,
    signInWithGoogle: auth.signInWithGoogle,
    signOut: auth.signOut,
    useUser: () => auth.state,
  };
});

vi.mock("@/lib/user-sync", () => ({ startUserSync: vi.fn() }));

const toastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { error: toastError } }));

const GOOGLE_USER = {
  id: "u1",
  email: "ada@example.com",
  user_metadata: { full_name: "Ada Lovelace", avatar_url: "https://example.com/a.png" },
} as unknown as User;

beforeAll(() => {
  // Radix popper measures its anchor; jsdom has no ResizeObserver.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  auth.state = { user: null, loading: false };
  auth.signInWithGoogle.mockReset().mockResolvedValue(undefined);
  auth.signOut.mockReset().mockResolvedValue(undefined);
  toastError.mockReset();
});

describe("Navbar", () => {
  it("no longer links to /admin (desktop or mobile)", () => {
    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    // Open the mobile menu too so both link sets are in the DOM.
    fireEvent.click(container.querySelector("button.md\\:hidden") as HTMLElement);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(container.querySelector('a[href="/admin"]')).toBeNull();
    expect(screen.getAllByText("Conditions").length).toBeGreaterThan(0);
  });

  it("shows the Google sign-in button when signed out", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
  });
});

describe("AuthButton", () => {
  it("renders nothing while the session is loading", () => {
    auth.state = { user: null, loading: true };
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("signed out: calls signInWithGoogle on click", async () => {
    render(<AuthButton />);
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));
    await waitFor(() => expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(toastError).not.toHaveBeenCalled();
  });

  it("signed out: toasts when sign-in fails", async () => {
    auth.signInWithGoogle.mockRejectedValue(new Error("provider disabled"));
    render(<AuthButton />);
    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Could not sign in with Google", {
        description: "provider disabled",
      }),
    );
  });

const renderSignedIn = (user: User = GOOGLE_USER) => {
    auth.state = { user, loading: false };
    return render(
      <MemoryRouter>
        <AuthButton />
      </MemoryRouter>,
    );
  };

  const openMenu = (name: RegExp) =>
    fireEvent.keyDown(screen.getByRole("button", { name }), { key: "Enter" });

  it("signed in: shows only the avatar in the navbar, no name text", () => {
    renderSignedIn();

    expect(screen.queryByRole("button", { name: /sign in with google/i })).toBeNull();
    expect(screen.getByText("AL")).toBeInTheDocument(); // initials until the photo loads
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    expect(screen.queryByText("ada@example.com")).toBeNull();
  });

  it("signed in: menu shows name, email, My Profile and a red Sign Out", async () => {
    renderSignedIn();
    openMenu(/account menu for ada lovelace/i);

    const profile = await screen.findByRole("menuitem", { name: /my profile/i });
    expect(profile).toHaveAttribute("href", "/profile");
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();

    const signOutItem = screen.getByRole("menuitem", { name: /sign out/i });
    expect(signOutItem).toHaveClass("text-red-600");
    fireEvent.click(signOutItem);
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
  });

  it("falls back to the email when Google gives no name", async () => {
    renderSignedIn({ ...GOOGLE_USER, user_metadata: {} } as unknown as User);
    openMenu(/account menu for ada@example.com/i);
    expect(await screen.findByText("ada@example.com")).toBeInTheDocument();
  });
});
