import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import DeleteAccount from "@/pages/DeleteAccount";
import Footer from "@/components/Footer";
import { LEGAL } from "@/lib/legal";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
      </Routes>
    </MemoryRouter>,
  );

describe.each([
  ["/privacy", "Privacy Policy"],
  ["/terms", "Terms of Service"],
  ["/delete-account", "Delete your account"],
])("legal page %s", (path, title) => {
  it("shows the title, effective date, owner and contact email", () => {
    renderAt(path);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(`Effective date: ${LEGAL.effectiveDate}`)).toBeInTheDocument();
    expect(screen.getAllByText(/Emerald Innovation Hub/).length).toBeGreaterThan(0);
    const emails = screen.getAllByRole("link", { name: "naturewellnessee47@gmail.com" });
    expect(emails.length).toBeGreaterThan(0);
    emails.forEach((a) => expect(a).toHaveAttribute("href", "mailto:naturewellnessee47@gmail.com"));
  });
});

describe("Footer", () => {
  it("renders the owner copyright and the three legal links", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByText("© 2026 Emerald Innovation Hub")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Legal" });
    expect(within(nav).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(within(nav).getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    expect(within(nav).getByRole("link", { name: "Delete Account" })).toHaveAttribute(
      "href",
      "/delete-account",
    );
  });
});
