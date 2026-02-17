import { Link, useLocation } from "react-router-dom";
import { Leaf, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/conditions", label: "Conditions" },
    { to: "/admin", label: "Admin" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-primary rounded-lg p-1.5">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-secondary" style={{ fontFamily: "'Merriweather', serif" }}>
            NatureWellness
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to}>
              <Button
                variant={isActive(l.to) ? "default" : "ghost"}
                size="sm"
              >
                {l.label}
              </Button>
            </Link>
          ))}
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-card px-4 py-3 space-y-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
              <Button variant={isActive(l.to) ? "default" : "ghost"} size="sm" className="w-full justify-start">
                {l.label}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
