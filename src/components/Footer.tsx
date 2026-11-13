import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { LEGAL } from "@/lib/legal";

const LEGAL_LINKS = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
  { to: "/delete-account", label: "Delete Account" },
] as const;

const Footer = () => (
  <footer className="border-t bg-card mt-auto">
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center gap-4">
        <div style={{ transform: 'scale(0.85)' }}>
          <Logo />
        </div>
        <div className="text-center">
          {/* The medical disclaimer lives only at the top of the page (Layout). */}
          <p className="text-xs text-muted-foreground">
            © 2026 {LEGAL.owner}
          </p>
          <nav aria-label="Legal" className="mt-2 text-xs text-muted-foreground">
            {LEGAL_LINKS.map((link, i) => (
              <span key={link.to}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <Link to={link.to} className="hover:text-primary hover:underline">
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
