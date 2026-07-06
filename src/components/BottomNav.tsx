import { Link, useLocation } from "react-router-dom";
import { Clock, Heart, Home, User, type LucideIcon } from "lucide-react";

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/history", label: "History", icon: Clock },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/profile", label: "Profile", icon: User },
];

/**
 * Native-style bottom tab bar. Fixed to the viewport bottom on mobile, hidden
 * on desktop (md+), and respects the iOS home-indicator safe area.
 */
const BottomNav = () => {
  const { pathname } = useLocation();

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((tab) => {
          const active = isActive(tab.to);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-accent/15" : ""
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "fill-primary/15" : ""}`}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
