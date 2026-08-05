import { useCallback, useEffect, useState } from 'react';
import { storage } from './index';
import type { BaseRecord, CollectionName } from './types';

export type NewRecord<T extends BaseRecord> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<T, 'id'>>;

export interface CollectionApi<T extends BaseRecord> {
  items: T[];
  /** False as soon as the adapter has delivered its first snapshot. */
  loading: boolean;
  create: (draft: NewRecord<T>) => Promise<T>;
  update: (id: string, patch: Partial<Omit<T, 'id' | 'createdAt'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Pulls the adapter's current contents without waiting a frame. Adapters emit
 * synchronously on subscribe when they already hold data (the local adapter
 * always does), so this avoids a flash of empty state on mount. A future cloud
 * adapter that has nothing cached simply reports `loading: true` instead.
 */
function initialSnapshot<T extends BaseRecord>(name: CollectionName): {
  items: T[];
  loaded: boolean;
} {
  let items: T[] = [];
  let loaded = false;
  const unsubscribe = storage.subscribe<T>(name, (next) => {
    items = next;
    loaded = true;
  });
  unsubscribe();
  return { items, loaded };
}

/**
 * The one way features read and write data. Components never touch an adapter.
 */
export function useCollection<T extends BaseRecord>(name: CollectionName): CollectionApi<T> {
  const [state, setState] = useState(() => initialSnapshot<T>(name));

  useEffect(() => {
    setState(initialSnapshot<T>(name));
    return storage.subscribe<T>(name, (items) => setState({ items, loaded: true }));
  }, [name]);

  const create = useCallback(
    async (draft: NewRecord<T>): Promise<T> => {
      const now = Date.now();
      const record = {
        ...draft,
        id: draft.id ?? createId(),
        createdAt: now,
        updatedAt: now,
      } as unknown as T;
      await storage.put<T>(name, record);
      return record;
    },
    [name],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<void> => {
      const existing = await storage.get<T>(name, id);
      if (!existing) return;
      const record = { ...existing, ...patch, id, updatedAt: Date.now() } as unknown as T;
      await storage.put<T>(name, record);
    },
    [name],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await storage.remove(name, id);
    },
    [name],
  );

  return { items: state.items, loading: !state.loaded, create, update, remove };
}
