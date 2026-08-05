import { useCallback } from 'react';
import {
  BANK_CACHE_ID,
  DEFAULT_SETTINGS,
  GOOGLE_CACHE_ID,
  SETTINGS_ID,
  type AppSettings,
  type BankCache,
  type GoogleCacheMeta,
} from './storage';
import { useCollection } from './storage/useCollection';

/**
 * The `settings` collection holds a handful of singleton records keyed by a
 * well-known id, so each hook below reads the whole collection and picks its
 * own record out by id.
 */
export function useAppSettings(): {
  settings: AppSettings;
  save: (patch: Partial<Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
} {
  const { items, create, update } = useCollection<AppSettings>('settings');
  const record = items.find((item) => item.id === SETTINGS_ID);

  const settings: AppSettings = record ?? { ...DEFAULT_SETTINGS, createdAt: 0, updatedAt: 0 };

  const save = useCallback(
    async (patch: Partial<Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>>) => {
      if (record) {
        await update(SETTINGS_ID, patch);
        return;
      }
      await create({ ...DEFAULT_SETTINGS, ...patch, id: SETTINGS_ID });
    },
    [record, create, update],
  );

  return { settings, save };
}

export function useGoogleCacheMeta(): {
  meta: GoogleCacheMeta;
  save: (patch: Partial<Omit<GoogleCacheMeta, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
} {
  const { items, create, update } = useCollection<GoogleCacheMeta>('settings');
  const record = items.find((item) => item.id === GOOGLE_CACHE_ID);

  const meta: GoogleCacheMeta = record ?? {
    id: GOOGLE_CACHE_ID,
    lastSyncedAt: 0,
    connectedEmail: '',
    createdAt: 0,
    updatedAt: 0,
  };

  const save = useCallback(
    async (patch: Partial<Omit<GoogleCacheMeta, 'id' | 'createdAt' | 'updatedAt'>>) => {
      if (record) {
        await update(GOOGLE_CACHE_ID, patch);
        return;
      }
      await create({
        id: GOOGLE_CACHE_ID,
        lastSyncedAt: 0,
        connectedEmail: '',
        ...patch,
      });
    },
    [record, create, update],
  );

  return { meta, save };
}

export function useBankCache(): {
  cache: BankCache;
  save: (patch: Partial<Omit<BankCache, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
} {
  const { items, create, update } = useCollection<BankCache>('settings');
  const record = items.find((item) => item.id === BANK_CACHE_ID);

  const cache: BankCache = record ?? {
    id: BANK_CACHE_ID,
    connected: false,
    accounts: [],
    fetchedAt: 0,
    createdAt: 0,
    updatedAt: 0,
  };

  const save = useCallback(
    async (patch: Partial<Omit<BankCache, 'id' | 'createdAt' | 'updatedAt'>>) => {
      if (record) {
        await update(BANK_CACHE_ID, patch);
        return;
      }
      await create({ id: BANK_CACHE_ID, connected: false, accounts: [], fetchedAt: 0, ...patch });
    },
    [record, create, update],
  );

  return { cache, save };
}
