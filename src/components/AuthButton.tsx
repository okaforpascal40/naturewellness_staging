import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  authEnabled,
  avatarUrlOf,
  displayNameOf,
  initialsOf,
  signInWithGoogle,
  signOut,
  useUser,
} from "@/lib/supabase";
import { startUserSync } from "@/lib/user-sync";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Google's official four-colour "G" mark. */
const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

/** "Sign in with Google" following Google's light-theme branding guidelines. */
export const GoogleSignInButton = ({ className }: { className?: string }) => {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      await signInWithGoogle();
      // On success the browser navigates away to Google.
    } catch (err) {
      toast.error("Could not sign in with Google", {
        description: err instanceof Error ? err.message : undefined,
      });
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2.5 rounded-full border border-[#747775] bg-white px-3 text-sm font-medium text-[#1F1F1F] transition-colors hover:bg-[#F8F9FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        className,
      )}
      style={{ fontFamily: "Roboto, Arial, sans-serif" }}
    >
      <GoogleMark />
      <span>Sign in with Google</span>
    </button>
  );
};

/** Navbar account control: Google sign-in when signed out; when signed in, just the
 *  avatar (photo, or initials on brand green), opening a menu with name, email,
 *  My Profile and Sign Out. */
const AuthButton = ({ className }: { className?: string }) => {
  const { user, loading } = useUser();

  // Idempotent: one auth subscription for the app's lifetime.
  useEffect(() => startUserSync(), []);

  if (!authEnabled || loading) return null;
  if (!user) return <GoogleSignInButton className={className} />;

  const name = displayNameOf(user);
  const avatarUrl = avatarUrlOf(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "rounded-full ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-[#2D6A4F]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
          // Only the avatar is clickable, even where the slot is full-width (mobile menu).
          "w-fit",
        )}
        aria-label={`Account menu for ${name}`}
      >
        <Avatar className="h-9 w-9 shadow-sm">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" />}
          <AvatarFallback className="bg-[#2D6A4F] text-xs font-semibold text-white">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl p-1.5">
        <DropdownMenuLabel className="px-2.5 py-2 font-normal">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {user.email && user.email !== name && (
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
          <Link to="/profile">
            <UserRound className="h-4 w-4" /> My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void signOut()}
          className="cursor-pointer gap-2 rounded-lg text-red-600 focus:bg-red-50 focus:text-red-700"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AuthButton;
