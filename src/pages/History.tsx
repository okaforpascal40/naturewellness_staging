import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { clearHistory, getHistory, type StoredEntry } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import StoredEntryCard from "@/components/StoredEntryCard";

const History = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<StoredEntry[]>(() => getHistory());

  const openEntry = (entry: StoredEntry) => {
    navigate(`/conditions/${entry.id}?name=${encodeURIComponent(entry.name)}`);
  };

  const handleClear = () => {
    if (entries.length === 0) return;
    clearHistory();
    setEntries([]);
    toast("History cleared");
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-secondary">Search History</h1>
          {entries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Clear History
            </Button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-20 text-center">
            <span className="text-5xl" role="img" aria-label="Magnifying glass">
              🔍
            </span>
            <h2 className="mt-4 text-lg font-semibold text-secondary">No searches yet</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Search a disease to get started. Your recent searches will appear here.
            </p>
            <Button className="mt-5 rounded-2xl" onClick={() => navigate("/")}>
              Start a search
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <StoredEntryCard key={entry.id} entry={entry} onOpen={() => openEntry(entry)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
