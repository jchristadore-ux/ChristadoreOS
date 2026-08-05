import { COLLECTIONS, type CollectionName, type StorageAdapter } from './types';

const PREFIX = 'familyos:';

type StoredRecord = { id: string } & Record<string, unknown>;

type Listener = (items: unknown[]) => void;

const keyFor = (collection: CollectionName): string => `${PREFIX}${collection}`;

const listeners = new Map<CollectionName, Set<Listener>>();

/**
 * Cache of the last parsed value per collection. Reads are hot (every render of
 * every feature) and localStorage is synchronous, so we parse once and
 * invalidate on write or on a cross-tab `storage` event.
 */
const cache = new Map<CollectionName, StoredRecord[]>();

function isStoredRecord(value: unknown): value is StoredRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string'
  );
}

function read(collection: CollectionName): StoredRecord[] {
  const cached = cache.get(collection);
  if (cached) return cached;

  let items: StoredRecord[] = [];
  try {
    const raw = localStorage.getItem(keyFor(collection));
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) items = parsed.filter(isStoredRecord);
    }
  } catch {
    // Corrupt or unavailable storage (private browsing, quota) degrades to an
    // empty collection rather than taking the app down.
    items = [];
  }
  cache.set(collection, items);
  return items;
}

function write(collection: CollectionName, items: StoredRecord[]): void {
  cache.set(collection, items);
  try {
    localStorage.setItem(keyFor(collection), JSON.stringify(items));
  } catch {
    // Keep the in-memory value so the session stays usable even if the write
    // failed; the user simply loses persistence.
  }
  emit(collection);
}

function emit(collection: CollectionName): void {
  const set = listeners.get(collection);
  if (!set) return;
  const items = read(collection);
  for (const listener of set) listener(items);
}

let storageListenerAttached = false;

function attachStorageListener(): void {
  if (storageListenerAttached || typeof window === 'undefined') return;
  storageListenerAttached = true;
  window.addEventListener('storage', (event: StorageEvent) => {
    if (!event.key || !event.key.startsWith(PREFIX)) return;
    const collection = event.key.slice(PREFIX.length) as CollectionName;
    if (!COLLECTIONS.includes(collection)) return;
    // Another tab changed this collection: drop the cache and re-emit so both
    // tabs converge on the same data.
    cache.delete(collection);
    emit(collection);
  });
}

export const localAdapter: StorageAdapter = {
  mode: 'local',

  async list<T>(collection: CollectionName): Promise<T[]> {
    return read(collection) as unknown as T[];
  },

  async get<T>(collection: CollectionName, id: string): Promise<T | null> {
    const found = read(collection).find((item) => item.id === id);
    return (found as unknown as T) ?? null;
  },

  async put<T>(collection: CollectionName, item: T): Promise<void> {
    const record = item as unknown as StoredRecord;
    if (!isStoredRecord(record)) {
      throw new Error(`Cannot store a record without a string id in "${collection}"`);
    }
    const items = read(collection);
    const index = items.findIndex((existing) => existing.id === record.id);
    const next = index === -1 ? [...items, record] : items.map((e, i) => (i === index ? record : e));
    write(collection, next);
  },

  async remove(collection: CollectionName, id: string): Promise<void> {
    const items = read(collection);
    if (!items.some((item) => item.id === id)) return;
    write(
      collection,
      items.filter((item) => item.id !== id),
    );
  },

  subscribe<T>(collection: CollectionName, cb: (items: T[]) => void): () => void {
    attachStorageListener();
    const listener: Listener = (items) => cb(items as unknown as T[]);
    const set = listeners.get(collection) ?? new Set<Listener>();
    set.add(listener);
    listeners.set(collection, set);
    // Emit current contents immediately so subscribers never render a blank
    // frame waiting on a first push.
    listener(read(collection));
    return () => {
      set.delete(listener);
    };
  },
};

/** Wipes every stored key. Used by "Clear all data" in Settings. */
export function clearAllLocalData(): void {
  for (const collection of COLLECTIONS) {
    try {
      localStorage.removeItem(keyFor(collection));
    } catch {
      // Ignore: the cache clear below still resets the running session.
    }
    cache.delete(collection);
  }
  for (const collection of COLLECTIONS) emit(collection);
}
