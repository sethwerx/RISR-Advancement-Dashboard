import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildSeedBundle, STORE_VERSION } from "@/lib/mock/seed";
import type { CalendarEvent, NoShowLogEntry, NotesDoc, TourNotes } from "@/lib/types";
import type { WalkInRecord } from "@/lib/walkin";

export type MockStore = {
  version: number;
  events: CalendarEvent[];
  notes: TourNotes[];
  log: NoShowLogEntry[];
  docs: Record<string, NotesDoc>;
  walkIns: WalkInRecord[];
};

const file = path.join(process.cwd(), "data", "mock-store.json");

function fresh(): MockStore {
  const seed = buildSeedBundle();
  return {
    version: STORE_VERSION,
    events: seed.events,
    notes: seed.notes,
    log: seed.log,
    docs: seed.docs,
    walkIns: [],
  };
}

function write(store: MockStore) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2));
  renameSync(tmp, file);
}

export function readStore(): MockStore {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as MockStore;
    if (parsed.version !== STORE_VERSION || !Array.isArray(parsed.events)) throw new Error("stale");
    const store = fresh();
    return {
      version: STORE_VERSION,
      events: parsed.events,
      notes: Array.isArray(parsed.notes) ? parsed.notes : store.notes,
      log: Array.isArray(parsed.log) ? parsed.log : store.log,
      docs: parsed.docs && typeof parsed.docs === "object" ? parsed.docs : store.docs,
      walkIns: Array.isArray(parsed.walkIns) ? parsed.walkIns : [],
    };
  } catch (error) {
    if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === "ENOENT" || (error as Error).message === "stale") {
      const store = fresh();
      write(store);
      return store;
    }
    const store = fresh();
    write(store);
    return store;
  }
}

let queue: Promise<unknown> = Promise.resolve();

export function updateStore<T>(mutator: (store: MockStore) => T): Promise<T> {
  const run = queue.then(() => {
    const store = readStore();
    const result = mutator(store);
    write(store);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
