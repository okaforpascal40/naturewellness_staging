import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getFavorites, removeFromFavorites, type StoredEntry } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import StoredEntryCard from "@/components/StoredEntryCard";

const Favorites = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<StoredEntry[]>(() => getFavorites());

  const openEntry = (entry: StoredEntry) => {
    navigate(`/conditions/${entry.id}?name=${encodeURIComponent(entry.name)}`);
  };

  const handleDelete = (entry: StoredEntry) => {
    removeFromFavorites(entry.id);
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    toast("Removed from Favorites", { description: entry.name });
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary">Saved Conditions</h1>
          {entries.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Swipe or long-press a card to remove it.
            </p>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-20 text-center">
            <span className="text-5xl" role="img" aria-label="Bookmark">
              🔖
            </span>
            <h2 className="mt-4 text-lg font-semibold text-secondary">No saved conditions yet</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Tap the bookmark icon on any result to save it here for quick access.
            </p>
            <Button className="mt-5 rounded-2xl" onClick={() => navigate("/conditions")}>
              Browse conditions
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <StoredEntryCard
                key={entry.id}
                entry={entry}
                onOpen={() => openEntry(entry)}
                onDelete={() => handleDelete(entry)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
