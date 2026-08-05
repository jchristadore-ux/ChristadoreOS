import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBalances, isBankConfigured, totalBalance } from './bank';
import { useBankCache } from './useSettings';

/** How stale a balance may get before an app-open refreshes it. */
export const BALANCE_TTL_MS = 30 * 60 * 1000;

export interface BankBalances {
  connected: boolean;
  configured: boolean;
  accounts: ReturnType<typeof useBankCache>['cache']['accounts'];
  total: number;
  fetchedAt: number;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

/**
 * Serves the cached balance immediately and refreshes behind it, so the Today
 * card never waits on the network. A failed refresh leaves the last known
 * figure in place rather than blanking it — with its timestamp on show, an old
 * number is useful, a missing one is not.
 */
export function useBankBalances(): BankBalances {
  const { cache, save } = useBankCache();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const autoAttempted = useRef(false);

  const configured = isBankConfigured();

  const refresh = useCallback(async () => {
    if (running.current || !isBankConfigured()) return;
    running.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await fetchBalances();
      await save({
        connected: result.connected,
        accounts: result.accounts,
        fetchedAt: result.fetchedAt,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reach the bank worker.');
    } finally {
      running.current = false;
      setLoading(false);
    }
  }, [save]);

  useEffect(() => {
    if (autoAttempted.current || !configured) return;
    if (Date.now() - cache.fetchedAt < BALANCE_TTL_MS) return;
    autoAttempted.current = true;
    void refresh();
  }, [configured, cache.fetchedAt, refresh]);

  return {
    connected: cache.connected,
    configured,
    accounts: cache.accounts,
    total: totalBalance(cache.accounts),
    fetchedAt: cache.fetchedAt,
    loading,
    error,
    refresh,
  };
}
