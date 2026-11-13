import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LEGAL } from "@/lib/legal";

const LINK_CLASS = "font-medium text-primary underline underline-offset-2 hover:text-primary/80";

/** Shared single-column shell for the Privacy, Terms and Delete Account pages. */
export const LegalPage = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="container mx-auto max-w-3xl px-4 py-8">
    <h1 className="text-3xl font-bold text-secondary">{title}</h1>
    <p className="mt-2 text-sm text-muted-foreground">Effective date: {LEGAL.effectiveDate}</p>
    <div className="mt-6 space-y-4 leading-relaxed text-foreground">{children}</div>
  </div>
);

export const LegalSection = ({ heading, children }: { heading: string; children: ReactNode }) => (
  <section className="space-y-3 pt-4">
    <h2 className="text-xl font-semibold text-secondary">{heading}</h2>
    {children}
  </section>
);

export const ContactEmail = () => (
  <a href={`mailto:${LEGAL.contactEmail}`} className={LINK_CLASS}>
    {LEGAL.contactEmail}
  </a>
);

export const LegalLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className={LINK_CLASS}>
    {children}
  </Link>
);
