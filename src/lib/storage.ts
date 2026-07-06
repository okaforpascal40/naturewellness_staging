/**
 * localStorage-backed persistence for search history, saved favorites and the
 * user profile. All reads/writes are defensive: a corrupt or unavailable store
 * (private mode, quota) degrades to sensible defaults instead of throwing, so
 * the UI never crashes on storage errors.
 */
import type { Recommendation } from "./api";
import { normalizeGrade, type GradeKey } from "./food-display";

const HISTORY_KEY = "nw_history";
const FAVORITES_KEY = "nw_favorites";
const PROFILE_KEY = "nw_profile";
const HISTORY_LIMIT = 20;

/** Notifies same-tab listeners (e.g. the bottom nav badges) after a write. */
const STORAGE_EVENT = "nw-storage-change";

/** Minimal disease identity needed to re-open a result set. */
export interface DiseaseRef {
  /** Route param used to re-open at `/conditions/:id`. */
  id: string;
  name: string;
  mondoId: string;
}

export interface StoredEntry extends DiseaseRef {
  /** Epoch milliseconds when the entry was saved. */
  savedAt: number;
  foodsFound: number;
  totalPublications: number;
  gradeCounts: Record<"A" | "B" | "C", number>;
  /** Up to three top food names, strongest evidence first. */
  topFoods: string[];
}

/* ------------------------------------------------------------------ */
/* Low-level helpers                                                   */
/* ------------------------------------------------------------------ */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`storage: could not read "${key}"`, err);
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Same-tab notification (the native `storage` event only fires cross-tab).
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }));
  } catch (err) {
    console.warn(`storage: could not write "${key}"`, err);
  }
}

const GRADE_RANK: Record<GradeKey, number> = { A: 3, B: 2, C: 1, None: 0 };

/** Condense a full result set into the compact summary the cards display. */
function summarize(results: Recommendation[]): Omit<StoredEntry, keyof DiseaseRef | "savedAt"> {
  const gradeCounts = { A: 0, B: 0, C: 0 };
  let totalPublications = 0;

  // Best grade + accumulated publications per unique food, for ranking top foods.
  const byFood = new Map<string, { name: string; grade: GradeKey; pubs: number }>();

  for (const r of results) {
    const grade = normalizeGrade(r.evidence_grade);
    if (grade === "A" || grade === "B" || grade === "C") gradeCounts[grade]++;
    totalPublications += r.publication_count || 0;

    const name = (r.fruit_vegetable || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = byFood.get(key);
    if (!existing) {
      byFood.set(key, { name, grade, pubs: r.publication_count || 0 });
    } else {
      if (GRADE_RANK[grade] > GRADE_RANK[existing.grade]) existing.grade = grade;
      existing.pubs += r.publication_count || 0;
    }
  }

  const topFoods = [...byFood.values()]
    .sort((a, b) => GRADE_RANK[b.grade] - GRADE_RANK[a.grade] || b.pubs - a.pubs)
    .slice(0, 3)
    .map((f) => f.name);

  return { foodsFound: byFood.size, totalPublications, gradeCounts, topFoods };
}

function buildEntry(disease: DiseaseRef, results: Recommendation[]): StoredEntry {
  return {
    id: disease.id,
    name: disease.name,
    mondoId: disease.mondoId,
    savedAt: Date.now(),
    ...summarize(results),
  };
}

/* ------------------------------------------------------------------ */
/* Search history                                                      */
/* ------------------------------------------------------------------ */

export function saveToHistory(disease: DiseaseRef, results: Recommendation[]): void {
  if (!disease.id) return;
  const entry = buildEntry(disease, results);
  const existing = read<StoredEntry[]>(HISTORY_KEY, []).filter((e) => e.id !== disease.id);
  write(HISTORY_KEY, [entry, ...existing].slice(0, HISTORY_LIMIT));
}

export function getHistory(): StoredEntry[] {
  return read<StoredEntry[]>(HISTORY_KEY, []).slice(0, HISTORY_LIMIT);
}

export function clearHistory(): void {
  write(HISTORY_KEY, []);
}

/* ------------------------------------------------------------------ */
/* Favorites                                                           */
/* ------------------------------------------------------------------ */

export function saveToFavorites(disease: DiseaseRef, results: Recommendation[]): void {
  if (!disease.id) return;
  const entry = buildEntry(disease, results);
  const existing = read<StoredEntry[]>(FAVORITES_KEY, []).filter((e) => e.id !== disease.id);
  write(FAVORITES_KEY, [entry, ...existing]);
}

export function removeFromFavorites(diseaseId: string): void {
  const existing = read<StoredEntry[]>(FAVORITES_KEY, []).filter((e) => e.id !== diseaseId);
  write(FAVORITES_KEY, existing);
}

export function getFavorites(): StoredEntry[] {
  return read<StoredEntry[]>(FAVORITES_KEY, []);
}

export function isFavorite(diseaseId: string): boolean {
  return read<StoredEntry[]>(FAVORITES_KEY, []).some((e) => e.id === diseaseId);
}

/* ------------------------------------------------------------------ */
/* Profile & settings                                                  */
/* ------------------------------------------------------------------ */

export type SearchMode = "disease" | "symptom";

export interface Profile {
  name: string;
  email: string;
  language: string;
  searchMode: SearchMode;
  notifications: boolean;
  academicMode: boolean;
}

export const LANGUAGES = ["English", "French", "Hausa", "Yoruba", "Igbo"] as const;

export const DEFAULT_PROFILE: Profile = {
  name: "",
  email: "",
  language: "English",
  searchMode: "disease",
  notifications: true,
  academicMode: true,
};

export function getProfile(): Profile {
  return { ...DEFAULT_PROFILE, ...read<Partial<Profile>>(PROFILE_KEY, {}) };
}

export function saveProfile(patch: Partial<Profile>): Profile {
  const next = { ...getProfile(), ...patch };
  write(PROFILE_KEY, next);
  return next;
}

/* ------------------------------------------------------------------ */
/* Change subscription                                                 */
/* ------------------------------------------------------------------ */

/** Subscribe to same-tab + cross-tab storage changes. Returns an unsubscribe fn. */
export function onStorageChange(listener: () => void): () => void {
  const handler = () => listener();
  window.addEventListener(STORAGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
