import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CACHE_TTL_MS,
  hasGoogleToken,
  isGoogleConfigured,
  listGoogleCalendars,
  syncGoogleEvents,
} from './google';
import { useAppSettings, useGoogleCacheMeta } from './useSettings';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface GoogleSync {
  status: SyncStatus;
  error: string;
  lastSyncedAt: number;
  connected: boolean;
  configured: boolean;
  refresh: () => Promise<void>;
}

/**
 * Keeps the cached Google events fresh: refreshes on app open when the cache is
 * older than 15 minutes, and exposes a manual refresh for the button in
 * Settings. Does nothing at all when Google is not configured or not connected.
 */
export function useGoogleSync(): GoogleSync {
  const { settings } = useAppSettings();
  const { meta, save } = useGoogleCacheMeta();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState('');
  const running = useRef(false);
  const autoAttempted = useRef(false);

  const selectedIds = settings.googleCalendarIds;
  const configured = isGoogleConfigured();
  const connected = configured && hasGoogleToken();

  const refresh = useCallback(async () => {
    if (running.current) return;
    if (!isGoogleConfigured() || !hasGoogleToken() || selectedIds.length === 0) return;

    running.current = true;
    setStatus('syncing');
    setError('');
    try {
      const calendars = await listGoogleCalendars();
      const chosen = calendars.filter((calendar) => selectedIds.includes(calendar.id));
      await syncGoogleEvents(chosen);
      await save({ lastSyncedAt: Date.now() });
      setStatus('idle');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reach Google Calendar');
      setStatus('error');
    } finally {
      running.current = false;
    }
  }, [selectedIds, save]);

  useEffect(() => {
    if (autoAttempted.current) return;
    if (!connected || selectedIds.length === 0) return;
    if (Date.now() - meta.lastSyncedAt < CACHE_TTL_MS) return;
    autoAttempted.current = true;
    void refresh();
  }, [connected, selectedIds, meta.lastSyncedAt, refresh]);

  return {
    status,
    error,
    lastSyncedAt: meta.lastSyncedAt,
    connected,
    configured,
    refresh,
  };
}
