import { useRef, useState } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { StoredEntry } from "@/lib/storage";

interface StoredEntryCardProps {
  entry: StoredEntry;
  onOpen: () => void;
  /** When provided, enables swipe-left / long-press to reveal a delete action. */
  onDelete?: () => void;
}

const GRADE_STYLES: Record<"A" | "B" | "C", string> = {
  A: "bg-evidence-a text-evidence-a-foreground",
  B: "bg-evidence-b text-evidence-b-foreground",
  C: "bg-evidence-c text-evidence-c-foreground",
};

const REVEAL_PX = 84; // width of the delete drawer

/** A tappable summary card for a saved search or favorite condition. */
const StoredEntryCard = ({ entry, onOpen, onDelete }: StoredEntryCardProps) => {
  const [offset, setOffset] = useState(0); // resting translateX (0 or -REVEAL_PX)
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const restOffset = useRef(0); // offset when the current gesture began
  const dragOffset = useRef(0); // live offset during the current gesture
  const longPress = useRef<number | null>(null);

  const relative = (() => {
    try {
      return formatDistanceToNow(new Date(entry.savedAt), { addSuffix: true });
    } catch {
      return "recently";
    }
  })();

  const grades = (["A", "B", "C"] as const).filter((g) => entry.gradeCounts?.[g] > 0);

  const clearLongPress = () => {
    if (longPress.current) {
      window.clearTimeout(longPress.current);
      longPress.current = null;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!onDelete) return;
    startX.current = e.touches[0].clientX;
    restOffset.current = offset;
    dragOffset.current = offset;
    setDragging(true);
    clearLongPress();
    longPress.current = window.setTimeout(() => {
      dragOffset.current = -REVEAL_PX;
      setOffset(-REVEAL_PX);
    }, 450);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!onDelete || startX.current === null) return;
    const delta = e.touches[0].clientX - startX.current;
    if (Math.abs(delta) > 6) clearLongPress();
    // Leftward drag only, anchored to the offset the gesture started from.
    dragOffset.current = Math.max(-REVEAL_PX, Math.min(0, restOffset.current + delta));
    e.currentTarget.style.transform = `translateX(${dragOffset.current}px)`;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!onDelete) return;
    clearLongPress();
    setDragging(false);
    startX.current = null;
    const settled = dragOffset.current < -REVEAL_PX / 2 ? -REVEAL_PX : 0;
    dragOffset.current = settled;
    setOffset(settled);
    e.currentTarget.style.transform = "";
  };

  const handleCardClick = () => {
    // If the delete drawer is open, a tap just closes it instead of navigating.
    if (offset !== 0) {
      setOffset(0);
      return;
    }
    onOpen();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete drawer (revealed on swipe) */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${entry.name}`}
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive px-6 text-destructive-foreground"
          style={{ width: REVEAL_PX }}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}

      <button
        type="button"
        onClick={handleCardClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`relative flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 text-left shadow-sm ${
          dragging ? "" : "transition-transform"
        } ${offset !== 0 ? "-translate-x-[84px]" : ""}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-semibold capitalize text-foreground">{entry.name}</h3>
            <span className="shrink-0 text-xs text-muted-foreground">{relative}</span>
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {entry.foodsFound} food{entry.foodsFound === 1 ? "" : "s"} found
            {entry.totalPublications > 0 && (
              <> · {entry.totalPublications} publication{entry.totalPublications === 1 ? "" : "s"}</>
            )}
          </p>

          {grades.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {grades.map((g) => (
                <span
                  key={g}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${GRADE_STYLES[g]}`}
                >
                  {entry.gradeCounts[g]} Grade {g}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">No graded results</p>
          )}

          {entry.topFoods.length > 0 && (
            <p className="mt-2 truncate text-xs text-foreground/70">
              {entry.topFoods.join(" · ")}
            </p>
          )}
        </div>

        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
};

export default StoredEntryCard;
