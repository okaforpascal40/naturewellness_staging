import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearHistory,
  getFavorites,
  getHistory,
  onStorageChange,
  removeFromFavorites,
  saveToFavorites,
  saveToHistory,
  type StoredEntry,
} from "@/lib/storage";
import {
  entryToRow,
  handleSession,
  resetUserSyncForTests,
  rowToEntry,
} from "@/lib/user-sync";

// user-sync only touches the real client in startUserSync(), which isn't used here.
vi.mock("@/lib/supabase", () => ({ supabase: null, authEnabled: false }));

type Row = object;

/** Minimal chainable stand-in for the supabase-js query builder. */
function fakeClient(
  remote: Record<string, Row[]> = {},
  pullGate: Promise<void> = Promise.resolve(),
  failUpsert: (table: string, rows: Row[]) => boolean = () => false,
) {
  const upserts: { table: string; rows: Row[]; opts: unknown }[] = [];
  const deletes: { table: string; filters: [string, unknown][] }[] = [];
  const lookups: { table: string; ids: string[] }[] = [];
  const ok = Promise.resolve({ error: null });

  const from = vi.fn((table: string) => ({
    upsert: (rows: Row[], opts: unknown) => {
      upserts.push({ table, rows, opts });
      return failUpsert(table, rows) ? Promise.resolve({ error: new Error("upsert rejected") }) : ok;
    },
    delete: () => {
      const filters: [string, unknown][] = [];
      deletes.push({ table, filters });
      const builder = {
        eq: (col: string, val: unknown) => {
          filters.push([col, val]);
          return builder;
        },
        then: ok.then.bind(ok),
      };
      return builder;
    },
    select: () => ({
      // Full pull: newest first, capped, like the real query.
      order: (col: string) => ({
        limit: async (n: number) => {
          await pullGate;
          const rows = [...((remote[table] ?? []) as Record<string, string>[])].sort((a, b) =>
            b[col].localeCompare(a[col]),
          );
          return { data: rows.slice(0, n), error: null };
        },
      }),
      // Timestamp lookup for ids outside the pulled page.
      in: (_col: string, ids: string[]) => {
        lookups.push({ table, ids });
        const rows = (remote[table] ?? []) as { disease_id: string }[];
        return Promise.resolve({ data: rows.filter((r) => ids.includes(r.disease_id)), error: null });
      },
    }),
  }));

  return { client: { from } as unknown as SupabaseClient, from, upserts, deletes, lookups };
}

const session = (id: string) => ({ user: { id } }) as unknown as Session;

const DISEASE = { id: "MONDO_0005148", name: "type 2 diabetes mellitus", mondoId: "MONDO_0005148" };

const entry = (id: string, savedAt: number, name = id): StoredEntry => ({
  id,
  name,
  mondoId: id,
  savedAt,
  foodsFound: 2,
  totalPublications: 10,
  gradeCounts: { A: 1, B: 1, C: 0 },
  topFoods: ["Turmeric"],
});

beforeEach(() => {
  localStorage.clear();
  resetUserSyncForTests();
});

afterEach(() => resetUserSyncForTests());

describe("row mapping", () => {
  it("round-trips a StoredEntry without loss", () => {
    const e = entry("EFO_1", Date.UTC(2026, 0, 2));
    expect(rowToEntry(entryToRow(e, "u1", "searched_at"), "searched_at")).toEqual(e);
    expect(entryToRow(e, "u1", "saved_at")).toMatchObject({ user_id: "u1", disease_id: "EFO_1" });
  });
});

describe("write-through", () => {
  it("does not touch Supabase when signed out", async () => {
    const fake = fakeClient();
    // Install the sink, then end the session: the sink must be detached.
    handleSession(fake.client, session("u1"));
    await vi.waitFor(() => expect(fake.from).toHaveBeenCalledWith("user_favorites"));
    handleSession(fake.client, null);
    fake.from.mockClear();

    saveToHistory(DISEASE, []);
    saveToFavorites(DISEASE, []);
    removeFromFavorites(DISEASE.id);
    clearHistory();
    expect(fake.from).not.toHaveBeenCalled();
    expect(getFavorites()).toEqual([]);
  });

  it("mirrors history/favorites writes when signed in", async () => {
    const fake = fakeClient();
    handleSession(fake.client, session("u1"));
    await vi.waitFor(() => expect(fake.from).toHaveBeenCalledWith("user_favorites")); // merge pull
    fake.upserts.length = 0;

    saveToHistory(DISEASE, []);
    saveToFavorites(DISEASE, []);
    expect(fake.upserts).toEqual([
      {
        table: "user_history",
        rows: [expect.objectContaining({ user_id: "u1", disease_id: DISEASE.id, mondo_id: DISEASE.mondoId })],
        opts: { onConflict: "user_id,disease_id" },
      },
      {
        table: "user_favorites",
        rows: [expect.objectContaining({ user_id: "u1", disease_id: DISEASE.id, saved_at: expect.any(String) })],
        opts: { onConflict: "user_id,disease_id" },
      },
    ]);

    removeFromFavorites(DISEASE.id);
    clearHistory();
    expect(fake.deletes).toEqual([
      { table: "user_favorites", filters: [["user_id", "u1"], ["disease_id", DISEASE.id]] },
      { table: "user_history", filters: [["user_id", "u1"]] },
    ]);
    // Local cache still updated synchronously.
    expect(getHistory()).toEqual([]);
    expect(getFavorites()).toEqual([]);
  });

  it("logs, never throws, when the remote write fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fake = fakeClient();
    handleSession(fake.client, session("u1"));
    await vi.waitFor(() => expect(fake.from).toHaveBeenCalled());
    fake.from.mockImplementation(() => {
      throw new Error("network down");
    });
    expect(() => saveToHistory(DISEASE, [])).not.toThrow();
    expect(getHistory()).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("merge on sign-in", () => {
  it("pulls remote rows into the local cache, newest wins, and pushes newer local entries", async () => {
    // Local: A (older than remote copy), L (local-only).
    localStorage.setItem("nw_history", JSON.stringify([entry("A", 1000, "old A"), entry("L", 500)]));
    const remoteA = entryToRow(entry("A", 2000, "new A"), "u1", "searched_at");
    const remoteR = entryToRow(entry("R", 1500), "u1", "searched_at");
    const remoteFav = entryToRow(entry("F", 3000), "u1", "saved_at");
    const fake = fakeClient({ user_history: [remoteA, remoteR], user_favorites: [remoteFav] });

    const changed = vi.fn();
    const unsubscribe = onStorageChange(changed);
    handleSession(fake.client, session("u1"));

    await vi.waitFor(() => expect(getHistory().map((e) => e.id)).toEqual(["A", "R", "L"]));
    expect(getHistory()[0].name).toBe("new A");
    expect(getFavorites().map((e) => e.id)).toEqual(["F"]);
    expect(changed).toHaveBeenCalled();

    // Only L was missing/newer locally, so only L is pushed.
    expect(fake.upserts).toEqual([
      expect.objectContaining({
        table: "user_history",
        rows: [expect.objectContaining({ disease_id: "L", user_id: "u1" })],
      }),
    ]);
    unsubscribe();
  });

  it("never overwrites a newer remote row that sits outside the pulled page", async () => {
    // 20 newer rows fill the pull; X's remote copy (5000) is below them but newer than local X (1000).
    const rows = Array.from({ length: 20 }, (_, i) =>
      entryToRow(entry(`D${i}`, 10_000 - i), "u1", "searched_at"),
    );
    rows.push(entryToRow(entry("X", 5000, "remote X"), "u1", "searched_at"));
    localStorage.setItem("nw_history", JSON.stringify([entry("X", 1000, "stale X"), entry("Y", 900)]));
    const fake = fakeClient({ user_history: rows });

    handleSession(fake.client, session("u1"));
    await vi.waitFor(() => expect(fake.upserts).toHaveLength(1));
    expect(fake.lookups).toEqual([{ table: "user_history", ids: ["X", "Y"] }]);
    expect(fake.upserts[0]).toMatchObject({
      table: "user_history",
      rows: [expect.objectContaining({ disease_id: "Y" })],
    });
  });

  it("does not resurrect history the user cleared while the pull was in flight", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    localStorage.setItem("nw_history", JSON.stringify([entry("L", 500)]));
    const fake = fakeClient(
      {
        user_history: [entryToRow(entry("R", 1500), "u1", "searched_at")],
        user_favorites: [entryToRow(entry("F", 3000), "u1", "saved_at")],
      },
      gate,
    );

    handleSession(fake.client, session("u1"));
    clearHistory();
    release();

    // Favorites (untouched) still merge; history stays cleared on both sides.
    await vi.waitFor(() => expect(getFavorites().map((e) => e.id)).toEqual(["F"]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getHistory()).toEqual([]);
    expect(fake.upserts.filter((u) => u.table === "user_history")).toEqual([]);
    expect(fake.deletes).toEqual([{ table: "user_history", filters: [["user_id", "u1"]] }]);
  });

  it("caps merged history at the history limit", async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      entryToRow(entry(`D${i}`, 10_000 - i), "u1", "searched_at"),
    );
    handleSession(fakeClient({ user_history: rows }).client, session("u1"));
    await vi.waitFor(() => expect(getHistory()).toHaveLength(20));
    expect(getHistory()[0].id).toBe("D0");
  });
});

describe("sign-out", () => {
  it("clears synced history/favorites locally without deleting remote rows", async () => {
    const fake = fakeClient({ user_favorites: [entryToRow(entry("F", 3000), "u1", "saved_at")] });
    handleSession(fake.client, session("u1"));
    await vi.waitFor(() => expect(getFavorites()).toHaveLength(1));
    saveToHistory(DISEASE, []);

    handleSession(fake.client, null);
    expect(getHistory()).toEqual([]);
    expect(getFavorites()).toEqual([]);
    expect(fake.deletes).toEqual([]);

    // Detached: later writes stay local.
    fake.upserts.length = 0;
    saveToHistory(DISEASE, []);
    expect(fake.upserts).toEqual([]);
  });

  it("leaves anonymous local data alone when there was no session to begin with", () => {
    saveToHistory(DISEASE, []);
    handleSession(fakeClient().client, null);
    expect(getHistory()).toHaveLength(1);
  });
});

/** Let pending fake requests and merge continuations run. */
const settle = async (ticks = 3) => {
  for (let i = 0; i < ticks; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

/** Simulate a page reload: in-memory state is lost, localStorage survives. */
const reload = () => resetUserSyncForTests();

const ids = (entries: StoredEntry[]) => entries.map((e) => e.id);

describe("cross-device deletions", () => {
  it("does not resurrect entries deleted on another device when a reload re-merges", async () => {
    const f1 = entryToRow(entry("F1", 3000), "u1", "saved_at");
    const f2 = entryToRow(entry("F2", 2000), "u1", "saved_at");
    const h1 = entryToRow(entry("H1", 1000), "u1", "searched_at");
    handleSession(fakeClient({ user_history: [h1], user_favorites: [f1, f2] }).client, session("u1"));
    await vi.waitFor(() => expect(ids(getFavorites())).toEqual(["F1", "F2"]));
    expect(ids(getHistory())).toEqual(["H1"]);
    await settle();

    // Device 2 removes F2 and clears history; device 1 reloads, still signed in.
    reload();
    const after = fakeClient({ user_favorites: [f1] });
    handleSession(after.client, session("u1"));
    await vi.waitFor(() => expect(ids(getFavorites())).toEqual(["F1"]));
    expect(getHistory()).toEqual([]);
    await settle();
    expect(after.upserts).toEqual([]);
  });

  it("pushes, rather than drops, entries saved after a reload but before the session is restored", async () => {
    const f1 = entryToRow(entry("F1", 3000), "u1", "saved_at");
    handleSession(fakeClient({ user_favorites: [f1] }).client, session("u1"));
    await vi.waitFor(() => expect(ids(getFavorites())).toEqual(["F1"]));
    await settle();

    // Reload: no sink until auth init finishes, but the page saves meanwhile.
    reload();
    saveToFavorites({ id: "NEW", name: "New", mondoId: "NEW" }, []);
    saveToHistory({ id: "HNEW", name: "H New", mondoId: "HNEW" }, []);

    const after = fakeClient({ user_favorites: [f1] });
    handleSession(after.client, session("u1"));
    await settle(6);
    expect(ids(getFavorites()).sort()).toEqual(["F1", "NEW"]);
    expect(ids(getHistory())).toEqual(["HNEW"]);
    const pushed = after.upserts.flatMap((u) => u.rows.map((r) => (r as { disease_id: string }).disease_id));
    expect(pushed.sort()).toEqual(["HNEW", "NEW"]);
  });

  it("keeps a failed push dirty and retries it on the next merge, but drops confirmed ones", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing = (_table: string, rows: Row[]) =>
      rows.some((r) => (r as { disease_id: string }).disease_id === "FAIL");
    const first = fakeClient({}, Promise.resolve(), failing);
    handleSession(first.client, session("u1"));
    await vi.waitFor(() => expect(first.from).toHaveBeenCalledWith("user_favorites"));
    await settle();

    saveToHistory({ id: "OK", name: "ok", mondoId: "OK" }, []);
    saveToHistory({ id: "FAIL", name: "fail", mondoId: "FAIL" }, []);
    await settle();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("failed"), expect.anything());
    await new Promise((resolve) => setTimeout(resolve, 5)); // next merge starts after these writes

    // Reload. Remote: OK was since deleted on another device; FAIL never arrived.
    reload();
    const second = fakeClient();
    handleSession(second.client, session("u1"));
    await vi.waitFor(() => expect(second.upserts).toHaveLength(1));
    expect(second.upserts[0]).toMatchObject({
      table: "user_history",
      rows: [expect.objectContaining({ disease_id: "FAIL" })],
    });
    expect(ids(getHistory())).toEqual(["FAIL"]);
    await settle();

    // FAIL is now confirmed, so once it is deleted remotely it is not re-pushed.
    reload();
    const third = fakeClient();
    handleSession(third.client, session("u1"));
    await vi.waitFor(() => expect(getHistory()).toEqual([]));
    await settle();
    expect(third.upserts).toEqual([]);
    warn.mockRestore();
  });
});

describe("guest data", () => {
  it("merges guest data into the first account that signs in, then treats it as synced", async () => {
    saveToHistory(DISEASE, []);
    saveToFavorites(DISEASE, []);
    const remoteFav = entryToRow(entry("F", 3000), "u1", "saved_at");
    const fake = fakeClient({ user_favorites: [remoteFav] });
    handleSession(fake.client, session("u1"));

    await vi.waitFor(() => expect(fake.upserts).toHaveLength(2));
    expect(fake.upserts.map((u) => u.table).sort()).toEqual(["user_favorites", "user_history"]);
    expect(ids(getHistory())).toEqual([DISEASE.id]);
    expect(ids(getFavorites()).sort()).toEqual([DISEASE.id, "F"].sort());
    await settle();

    // Reload with the pushed rows on the remote: nothing to push again.
    reload();
    const pushed = (table: string) => fake.upserts.filter((u) => u.table === table).flatMap((u) => u.rows);
    const again = fakeClient({
      user_history: pushed("user_history"),
      user_favorites: [remoteFav, ...pushed("user_favorites")],
    });
    handleSession(again.client, session("u1"));
    await vi.waitFor(() => expect(again.from).toHaveBeenCalledWith("user_favorites"));
    await settle();
    expect(again.upserts).toEqual([]);
    expect(ids(getHistory())).toEqual([DISEASE.id]);
  });

  it("merges guest data made after another account signed out into the next account", async () => {
    const fake = fakeClient();
    handleSession(fake.client, session("u1"));
    await settle();
    handleSession(fake.client, null);

    saveToHistory(DISEASE, []);
    const next = fakeClient();
    handleSession(next.client, session("u2"));
    await vi.waitFor(() => expect(next.upserts).toHaveLength(1));
    expect(next.upserts[0].rows).toEqual([
      expect.objectContaining({ user_id: "u2", disease_id: DISEASE.id }),
    ]);
  });
});

describe("account ownership across reloads", () => {
  const seedUserA = async () => {
    const a = fakeClient({
      user_history: [entryToRow(entry("HA", 1000), "A", "searched_at")],
      user_favorites: [entryToRow(entry("FA", 2000), "A", "saved_at")],
    });
    handleSession(a.client, session("A"));
    await vi.waitFor(() => expect(ids(getFavorites())).toEqual(["FA"]));
    await settle();
  };

  it("clears A's cache when the session vanished before a reload, then B signs in", async () => {
    await seedUserA();

    // Reload: A's refresh token was revoked, INITIAL_SESSION is null, no SIGNED_OUT.
    reload();
    const b = fakeClient();
    handleSession(b.client, null);
    expect(getHistory()).toEqual([]);
    expect(getFavorites()).toEqual([]);

    handleSession(b.client, session("B"));
    await vi.waitFor(() => expect(b.from).toHaveBeenCalledWith("user_favorites"));
    await settle();
    expect(b.upserts).toEqual([]);
    expect(getFavorites()).toEqual([]);
  });

  it("clears A's cache when B is the initial session after a reload", async () => {
    await seedUserA();

    reload();
    const b = fakeClient();
    handleSession(b.client, session("B"));
    expect(getHistory()).toEqual([]);
    expect(getFavorites()).toEqual([]);
    await vi.waitFor(() => expect(b.from).toHaveBeenCalledWith("user_favorites"));
    await settle();
    expect(b.upserts).toEqual([]);
  });
});
