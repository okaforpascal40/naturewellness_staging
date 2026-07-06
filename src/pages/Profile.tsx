import { useState } from "react";
import {
  Bell,
  ChevronRight,
  GraduationCap,
  Leaf,
  Share2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  getProfile,
  LANGUAGES,
  saveProfile,
  type Profile as ProfileData,
  type SearchMode,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const APP_VERSION = "NatureWellness 47:12 v1.0.0";

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const Profile = () => {
  const [profile, setProfile] = useState<ProfileData>(() => getProfile());

  // Persist a patch and reflect it in local state.
  const update = (patch: Partial<ProfileData>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
    saveProfile(patch);
  };

  const initials = initialsOf(profile.name);

  const handleShare = async () => {
    const shareData = {
      title: "NatureWellness",
      text: "Discover plant foods backed by science for your health conditions.",
      url: typeof window !== "undefined" ? window.location.origin : "",
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.clipboard && shareData.url) {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Link copied to clipboard");
        return;
      }
      toast("Sharing isn't supported on this device");
    } catch (err) {
      // User cancelling the share sheet rejects the promise — not an error.
      if ((err as Error)?.name !== "AbortError") {
        toast.error("Could not share", { description: (err as Error)?.message });
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold text-secondary">Profile</h1>

        {/* ---------------- Identity ---------------- */}
        <Card className="rounded-3xl border-border/70 p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              {initials ? (
                <span className="text-2xl font-bold">{initials}</span>
              ) : (
                <Leaf className="h-9 w-9" />
              )}
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {profile.name || "Your Name"}
            </p>
            {profile.email && (
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                Name
              </Label>
              <Input
                id="name"
                value={profile.name}
                placeholder="Enter your name"
                onChange={(e) => update({ name: e.target.value })}
                className="h-12 rounded-2xl"
              />
            </div>
            <div>
              <Label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                placeholder="you@example.com"
                onChange={(e) => update({ email: e.target.value })}
                className="h-12 rounded-2xl"
              />
            </div>
          </div>
        </Card>

        {/* ---------------- Settings ---------------- */}
        <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Settings
        </h2>
        <Card className="divide-y divide-border/60 rounded-3xl border-border/70 p-0 shadow-sm">
          {/* Language */}
          <div className="flex items-center justify-between gap-3 p-4">
            <Label className="text-sm font-medium text-foreground">Preferred Language</Label>
            <Select value={profile.language} onValueChange={(v) => update({ language: v })}>
              <SelectTrigger className="h-10 w-40 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search mode */}
          <div className="flex items-center justify-between gap-3 p-4">
            <Label className="text-sm font-medium text-foreground">Search Mode</Label>
            <div className="inline-flex rounded-full border border-border bg-muted/50 p-0.5">
              {(["disease", "symptom"] as SearchMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update({ searchMode: m })}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    profile.searchMode === m
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between gap-3 p-4">
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="notifications" className="text-sm font-medium text-foreground">
                Notifications
              </Label>
            </span>
            <Switch
              id="notifications"
              checked={profile.notifications}
              onCheckedChange={(v) => update({ notifications: v })}
            />
          </div>

          {/* Academic mode */}
          <div className="flex items-center justify-between gap-3 p-4">
            <span className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="academic" className="text-sm font-medium text-foreground">
                Academic Mode
              </Label>
            </span>
            <Switch
              id="academic"
              checked={profile.academicMode}
              onCheckedChange={(v) => update({ academicMode: v })}
            />
          </div>
        </Card>

        {/* ---------------- App info ---------------- */}
        <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          App
        </h2>
        <Card className="rounded-3xl border-border/70 p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">NatureWellness</span> maps your
            health conditions to plant foods through the science of genes, pathways and
            phytochemicals — every recommendation graded by published evidence.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => toast("Thanks! App store rating is coming soon.")}
              className="h-11 flex-1 gap-2 rounded-2xl border-primary/30 text-primary hover:bg-accent/10"
            >
              <Star className="h-4 w-4" /> Rate the App
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="h-11 flex-1 gap-2 rounded-2xl border-primary/30 text-primary hover:bg-accent/10"
            >
              <Share2 className="h-4 w-4" /> Share App
            </Button>
          </div>

          <div className="mt-4 divide-y divide-border/60 border-t border-border/60">
            {[
              { label: "Privacy Policy" },
              { label: "Terms of Use" },
            ].map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={() => toast(`${row.label} is coming soon`)}
                className="flex w-full items-center justify-between py-3 text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                {row.label}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">{APP_VERSION}</p>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
