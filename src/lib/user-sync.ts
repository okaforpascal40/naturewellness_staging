/**
 * Keeps the localStorage history/favorites cache in sync with the signed-in
 * user's rows in Supabase (`user_history` / `user_favorites`).
 *
 * - Signed in: installs a write-through sink on `@/lib/storage`, then merges
 *   remote and local and pushes back local entries that were never confirmed
 *   on the remote ("dirty").
 * - Signed out: detaches the sink and clears the synced lists from this device.
 *
 * Sync state persisted next to the cache (survives reloads):
 * - `nw_sync_owner`: the user id the cached lists belong to. A cache with no
 *   owner is guest data and is adopted by the first account that signs in; a
 *   cache owned by someone else is wiped before merging.
 * - `nw_sync_dirty`: per-list `{ diseaseId: savedAt }` of local entries whose
 *   upsert has not succeeded yet. Everything else in an owned cache is known
 *   to the remote, so if the remote no longer has it, it was deleted on
 *   another device and is dropped locally instead of being re-pushed.
 *
 * `startUserSync()` is idempotent (module-level guard) so React StrictMode's
 * double effects and multiple AuthButton mounts never duplicate subscriptions.
 */
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  HISTORY_LIMIT,
  clearSyncedData,
  getFavorites,
  getHistory,
  mergeRemoteEntries,
  setRemoteSync,
  takeUnsentWrites,
  type RemoteSync,
  type StoredEntry,
} from "@/lib/storage";

const HISTORY_TABLE = "user_history";
const FAVORITES_TABLE = "user_favorites";
const FAVORITES_PULL_LIMIT = 500;

const OWNER_KEY = "nw_sync_owner";
const DIRTY_KEY = "nw_sync_dirty";

type TimeColumn = "searched_at" | "saved_at";
type ListName = "history" | "favorites";

const TABLES: Record<ListName, [string, TimeColumn]> = {
  history: [HISTORY_TABLE, "searched_at"],
  favorites: [FAVORITES_TABLE, "saved_at"],
};

interface UserEntryRow {
  disease_id: string;
  disease_name: string;
  mondo_id: string | null;
  foods_found: number | null;
  total_publications: number | null;
  grade_counts: Partial<Record<"A" | "B" | "C", number>> | null;
  top_foods: string[] | null;
  searched_at?: string | null;
  saved_at?: string | null;
}

/* ------------------------------------------------------------------ */
/* Row mapping                                                         */
/* ------------------------------------------------------------------ */

export function entryToRow(
  entry: StoredEntry,
  userId: string,
  timeColumn: TimeColumn,
): UserEntryRow & { user_id: string } {
  return {
    user_id: userId,
    disease_id: entry.id,
    disease_name: entry.name,
    mondo_id: entry.mondoId || null,
    foods_found: entry.foodsFound,
    total_publications: entry.totalPublications,
    grade_counts: entry.gradeCounts,
    top_foods: entry.topFoods,
    [timeColumn]: new Date(entry.savedAt).toISOString(),
  };
}

export function rowToEntry(row: UserEntryRow, timeColumn: TimeColumn): StoredEntry | null {
  if (!row?.disease_id) return null;
  const ts = Date.parse(row[timeColumn] ?? "");
  const grades = row.grade_counts ?? {};
  return {
    id: row.disease_id,
    name: row.disease_name ?? "",
    mondoId: row.mondo_id ?? "",
    savedAt: Number.isFinite(ts) ? ts : 0,
    foodsFound: row.foods_found ?? 0,
    totalPublications: row.total_publications ?? 0,
    gradeCounts: { A: grades.A ?? 0, B: grades.B ?? 0, C: grades.C ?? 0 },
    topFoods: Array.isArray(row.top_foods) ? row.top_foods : [],
  };
}

/* ------------------------------------------------------------------ */
/* Persisted sync state                                                */
/* ------------------------------------------------------------------ */

type DirtyMap = Record<ListName, Record<string, number>>;

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch (err) {
    console.warn("user-sync: could not read sync owner", err);
    return null;
  }
}

function writeOwner(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch (err) {
    console.warn("user-sync: could not write sync owner", err);
  }
}

function readDirty(): DirtyMap {
  try {
    const raw = localStorage.getItem(DIRTY_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<DirtyMap>) : {};
    return { history: { ...parsed.history }, favorites: { ...parsed.favorites } };
  } catch (err) {
    console.warn("user-sync: could not read dirty entries", err);
    return { history: {}, favorites: {} };
  }
}

function updateDirty(fn: (dirty: DirtyMap) => void): void {
  const dirty = readDirty();
  fn(dirty);
  try {
    localStorage.setItem(DIRTY_KEY, JSON.stringify(dirty));
  } catch (err) {
    console.warn("user-sync: could not write dirty entries", err);
  }
}

function markDirty(list: ListName, entries: StoredEntry[]): void {
  if (!entries.length) return;
  updateDirty((d) => {
    for (const e of entries) d[list][e.id] = Math.max(d[list][e.id] ?? 0, e.savedAt);
  });
}

/** Clear dirty flags for entries the remote now has (or that lost to a newer remote copy). */
function markClean(list: ListName, entries: StoredEntry[]): void {
  if (!entries.length) return;
  updateDirty((d) => {
    for (const e of entries) {
      // A newer local write of the same id may still be in flight: keep it dirty.
      if ((d[list][e.id] ?? -Infinity) <= e.savedAt) delete d[list][e.id];
    }
  });
}

function clearSyncState(): void {
  writeOwner(null);
  try {
    localStorage.removeItem(DIRTY_KEY);
  } catch (err) {
    console.warn("user-sync: could not clear dirty entries", err);
  }
}

/* ------------------------------------------------------------------ */
/* Remote writes                                                       */
/* ------------------------------------------------------------------ */

/** Await a Supabase request; errors are logged, never thrown. Resolves to success. */
async function send(label: string, request: PromiseLike<{ error: unknown }>): Promise<boolean> {
  try {
    const { error } = await request;
    if (!error) return true;
    console.warn(`user-sync: ${label} failed`, error);
  } catch (err) {
    console.warn(`user-sync: ${label} failed`, err);
  }
  return false;
}

/** Upsert entries; they stay dirty unless the write is confirmed. */
async function pushEntries(
  client: SupabaseClient,
  userId: string,
  list: ListName,
  entries: StoredEntry[],
): Promise<void> {
  const [table, timeColumn] = TABLES[list];
  markDirty(list, entries);
  let request: PromiseLike<{ error: unknown }>;
  try {
    request = client.from(table).upsert(
      entries.map((e) => entryToRow(e, userId, timeColumn)),
      { onConflict: "user_id,disease_id" },
    );
  } catch (err) {
    console.warn(`user-sync: ${table} upsert failed`, err);
    return; // stays dirty; retried on the next merge
  }
  if ((await send(`${table} upsert`, request)) && readOwner() === userId) markClean(list, entries);
}

/**
 * Bumped by every user deletion (clear history / remove favorite). A sign-in
 * merge whose pull straddles a deletion drops that list's merge and push, so
 * the stale snapshot can't resurrect what the user just removed.
 */
const deletionGen = { history: 0, favorites: 0 };

export function createRemoteSync(client: SupabaseClient, userId: string): RemoteSync {
  // Never rejects: failures are logged and the entry stays dirty for retry.
  const push = (list: ListName, entry: StoredEntry) =>
    void pushEntries(client, userId, list, [entry]);

  return {
    upsertHistory: (entry) => push("history", entry),
    clearHistory: () => {
      deletionGen.history++;
      updateDirty((d) => {
        d.history = {};
      });
      void send("history clear", client.from(HISTORY_TABLE).delete().eq("user_id", userId));
    },
    upsertFavorite: (entry) => push("favorites", entry),
    removeFavorite: (diseaseId) => {
      deletionGen.favorites++;
      updateDirty((d) => {
        delete d.favorites[diseaseId];
      });
      void send(
        "favorite delete",
        client.from(FAVORITES_TABLE).delete().eq("user_id", userId).eq("disease_id", diseaseId),
      );
    },
  };
}

/* ------------------------------------------------------------------ */
/* Merge on sign-in                                                    */
/* ------------------------------------------------------------------ */

async function pull(
  client: SupabaseClient,
  table: string,
  timeColumn: TimeColumn,
  limit: number,
): Promise<StoredEntry[]> {
  const { data, error } = await client
    .from(table)
    .select("*")
    .order(timeColumn, { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as UserEntryRow[])
    .map((row) => rowToEntry(row, timeColumn))
    .filter((e): e is StoredEntry => e !== null);
}

/** Remote timestamps (ms; NaN if unparsable) for ids, keyed by id. Missing ids have no row. */
async function lookupRemote(
  client: SupabaseClient,
  table: string,
  timeColumn: TimeColumn,
  ids: string[],
): Promise<Map<string, number>> {
  const { data, error } = await client
    .from(table)
    .select(`disease_id,${timeColumn}`)
    .in("disease_id", ids);
  if (error) throw error;
  return new Map(
    ((data ?? []) as Pick<UserEntryRow, "disease_id" | TimeColumn>[]).map((row) => [
      row.disease_id,
      Date.parse(row[timeColumn] ?? ""),
    ]),
  );
}

/** Local entries that are missing from the pulled rows or newer than the remote copy. */
function newerLocally(local: StoredEntry[], remoteEntries: StoredEntry[]): StoredEntry[] {
  const remoteById = new Map(remoteEntries.map((e) => [e.id, e.savedAt]));
  return local.filter((e) => {
    const remoteAt = remoteById.get(e.id);
    return remoteAt === undefined || e.savedAt > remoteAt;
  });
}

/**
 * The pull is capped (remote history is never trimmed), so an entry absent
 * from it may still have a row further down — possibly a newer one written by
 * another device. Look those ids up and keep only entries strictly newer.
 */
async function newerThanRemote(
  client: SupabaseClient,
  table: string,
  timeColumn: TimeColumn,
  candidates: StoredEntry[],
  pulled: StoredEntry[],
): Promise<StoredEntry[]> {
  const pulledIds = new Set(pulled.map((e) => e.id));
  const unseen = candidates.filter((e) => !pulledIds.has(e.id)).map((e) => e.id);
  if (!unseen.length) return candidates;

  const remoteAt = await lookupRemote(client, table, timeColumn, unseen);
  return candidates.filter((e) => {
    const at = remoteAt.get(e.id);
    return at === undefined || !Number.isFinite(at) || e.savedAt > at;
  });
}

/**
 * Ids of local entries that were already synced (not dirty, saved before this
 * merge started) but no longer exist remotely: deleted on another device.
 * When the pull hit its cap, absent ids are confirmed with a lookup first.
 */
async function deletedRemotely(
  client: SupabaseClient,
  list: ListName,
  pulled: StoredEntry[],
  limit: number,
  startedAt: number,
): Promise<Set<string>> {
  const [table, timeColumn] = TABLES[list];
  const local = list === "history" ? getHistory() : getFavorites();
  const dirty = readDirty()[list];
  const pulledIds = new Set(pulled.map((e) => e.id));
  const candidates = local
    .filter((e) => !pulledIds.has(e.id) && !(e.id in dirty) && e.savedAt < startedAt)
    .map((e) => e.id);
  if (!candidates.length || pulled.length < limit) return new Set(candidates);

  const remoteAt = await lookupRemote(client, table, timeColumn, candidates);
  return new Set(candidates.filter((id) => !remoteAt.has(id)));
}

/** Push dirty local entries that beat the remote copy, unless `stillValid()` turned false meanwhile. */
async function pushDirty(
  client: SupabaseClient,
  userId: string,
  list: ListName,
  local: StoredEntry[],
  pulled: StoredEntry[],
  stillValid: () => boolean,
): Promise<void> {
  const [table, timeColumn] = TABLES[list];
  const dirty = readDirty()[list];
  const pending = local.filter((e) => e.id in dirty);
  if (!pending.length) return;

  const candidates = newerLocally(pending, pulled);
  const winners = candidates.length
    ? await newerThanRemote(client, table, timeColumn, candidates, pulled)
    : [];
  if (!stillValid()) return;
  // Entries the remote already has at least as new are settled.
  const winnerIds = new Set(winners.map((e) => e.id));
  markClean(list, pending.filter((e) => !winnerIds.has(e.id)));
  if (winners.length) await pushEntries(client, userId, list, winners);
}

/**
 * Pull the user's rows and merge them into the local cache (newest wins,
 * history capped at HISTORY_LIMIT; this dispatches the storage change event).
 * Synced local entries the remote no longer has are dropped (deleted on another
 * device); dirty local entries strictly newer than the remote copy are pushed
 * and stay dirty until the upsert succeeds. A list the user deleted from while
 * the pull was in flight is left alone.
 */
export async function mergeOnSignIn(client: SupabaseClient, userId: string): Promise<void> {
  const gen = { ...deletionGen };
  const startedAt = Date.now();

  const [remoteHistory, remoteFavorites] = await Promise.all([
    pull(client, HISTORY_TABLE, "searched_at", HISTORY_LIMIT),
    pull(client, FAVORITES_TABLE, "saved_at", FAVORITES_PULL_LIMIT),
  ]);

  // Signed out (or switched account) while the pull was in flight.
  if (activeUserId !== userId) return;

  const historyValid = () => activeUserId === userId && deletionGen.history === gen.history;
  const favoritesValid = () => activeUserId === userId && deletionGen.favorites === gen.favorites;
  const none = new Set<string>();

  const [historyDrops, favoriteDrops] = await Promise.all([
    historyValid()
      ? deletedRemotely(client, "history", remoteHistory, HISTORY_LIMIT, startedAt)
      : none,
    favoritesValid()
      ? deletedRemotely(client, "favorites", remoteFavorites, FAVORITES_PULL_LIMIT, startedAt)
      : none,
  ]);
  if (activeUserId !== userId) return;

  // Snapshot of local entries (pre-merge, so a dirty entry pushed out of the
  // capped history by newer remote rows is still pushed).
  const localHistory = getHistory();
  const localFavorites = getFavorites();
  const hValid = historyValid();
  const fValid = favoritesValid();
  mergeRemoteEntries(hValid ? remoteHistory : [], fValid ? remoteFavorites : [], {
    history: hValid ? historyDrops : none,
    favorites: fValid ? favoriteDrops : none,
  });

  await Promise.all([
    hValid && pushDirty(client, userId, "history", localHistory, remoteHistory, historyValid),
    fValid && pushDirty(client, userId, "favorites", localFavorites, remoteFavorites, favoritesValid),
  ]);
}

/* ------------------------------------------------------------------ */
/* Auth wiring                                                         */
/* ------------------------------------------------------------------ */

let started = false;
let activeUserId: string | null = null;

/** Apply a session change. Exported for tests; the app goes through startUserSync. */
export function handleSession(client: SupabaseClient, session: Session | null): void {
  const userId = session?.user?.id ?? null;
  // Persisted owner of the cached lists; survives reloads, unlike activeUserId.
  const owner = readOwner();
  // Token refresh, tab refocus, duplicate event. A null initial session over
  // an owned cache (session lost before this page load) still needs clearing.
  if (userId === activeUserId && (userId !== null || owner === null)) return;

  const previous = activeUserId;
  activeUserId = userId;

  if (!userId) {
    setRemoteSync(null);
    // [ASSUMPTION] Shared-device privacy: signing out (or a session that
    // vanished without a SIGNED_OUT, e.g. expired refresh token) removes the
    // account's synced lists from this browser. They remain in Supabase.
    if (previous || owner) {
      clearSyncedData();
      clearSyncState();
    }
    return;
  }

  if (previous || (owner && owner !== userId)) {
    // Another account's cache (live switch or left over from before a reload).
    clearSyncedData();
    clearSyncState();
  }
  if (owner !== userId) {
    // Guest data (or an empty cache) is adopted: all of it needs pushing.
    markDirty("history", getHistory());
    markDirty("favorites", getFavorites());
    writeOwner(userId);
  }
  // Saved locally before this session was restored (e.g. right after a reload):
  // not on the remote yet, so they must be pushed rather than dropped as
  // deleted elsewhere. Must run before the sink is attached.
  const unsent = takeUnsentWrites();
  markDirty("history", getHistory().filter((e) => e.id in unsent.history));
  markDirty("favorites", getFavorites().filter((e) => e.id in unsent.favorites));

  setRemoteSync(createRemoteSync(client, userId));
  mergeOnSignIn(client, userId).catch((err: unknown) =>
    console.warn("user-sync: merge on sign-in failed", err),
  );
}

/** Subscribe to auth changes once for the app's lifetime. No-op without auth. */
export function startUserSync(): void {
  const client = supabase;
  if (started || !client) return;
  started = true;
  client.auth.onAuthStateChange((_event, session) => {
    // Supabase warns against awaiting client calls inside this callback (it
    // holds the auth lock); defer so the merge's queries don't deadlock.
    setTimeout(() => handleSession(client, session), 0);
  });
}

/** Test helper: forget the in-memory state (persisted sync state is kept, like a reload). */
export function resetUserSyncForTests(): void {
  started = false;
  activeUserId = null;
  setRemoteSync(null);
}
