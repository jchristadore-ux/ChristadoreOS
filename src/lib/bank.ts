/**
 * Client for the bank worker. The worker holds the SimpleFIN credential; this
 * side only ever sees balance figures and never a token.
 *
 * The worker URL and household key are per-device settings rather than build
 * constants, so they can be changed without a redeploy — and so the key is
 * never baked into the public bundle.
 */

const WORKER_URL_KEY = 'familyos:bank:worker-url';
const HOUSEHOLD_KEY_KEY = 'familyos:bank:household-key';

export interface BankAccount {
  id: string;
  name: string;
  org: string;
  balance: number;
  availableBalance: number | null;
  currency: string;
  asOf: number;
}

export interface BalancesResult {
  connected: boolean;
  accounts: BankAccount[];
  warnings: string[];
  fetchedAt: number;
}

interface StoredConfig {
  workerUrl: string;
  householdKey: string;
}

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function write(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Private browsing: the value simply will not persist.
  }
}

export const getBankConfig = (): StoredConfig => ({
  workerUrl: read(WORKER_URL_KEY),
  householdKey: read(HOUSEHOLD_KEY_KEY),
});

export function setBankConfig(config: StoredConfig): void {
  write(WORKER_URL_KEY, config.workerUrl.trim().replace(/\/+$/, ''));
  write(HOUSEHOLD_KEY_KEY, config.householdKey.trim());
}

export const isBankConfigured = (): boolean => {
  const { workerUrl, householdKey } = getBankConfig();
  return workerUrl.length > 0 && householdKey.length > 0;
};

interface ErrorBody {
  error?: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const { workerUrl, householdKey } = getBankConfig();
  if (!workerUrl || !householdKey) throw new Error('Add the worker URL and household key first.');

  let response: Response;
  try {
    response = await fetch(`${workerUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        'Content-Type': 'application/json',
        'X-Household-Key': householdKey,
      },
    });
  } catch {
    throw new Error('Could not reach the worker. Check the URL.');
  }

  if (response.status === 401) throw new Error('Wrong household key.');

  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (body as ErrorBody).error;
    throw new Error(message ?? `Request failed (${response.status}).`);
  }
  return body as T;
}

/** One-time exchange of a SimpleFIN setup token for a stored access URL. */
export const claimSetupToken = (setupToken: string): Promise<{ connected: boolean }> =>
  call('/bank/claim', { method: 'POST', body: JSON.stringify({ setupToken }) });

export async function fetchBalances(): Promise<BalancesResult> {
  const data = await call<Partial<BalancesResult>>('/bank/balances');
  return {
    connected: data.connected === true,
    accounts: data.accounts ?? [],
    warnings: data.warnings ?? [],
    fetchedAt: data.fetchedAt ?? Date.now(),
  };
}

export const disconnectBank = (): Promise<{ connected: boolean }> =>
  call('/bank/disconnect', { method: 'POST' });

/** Sum of every connected account, which is what the Today card shows. */
export const totalBalance = (accounts: BankAccount[]): number =>
  accounts.reduce((sum, account) => sum + account.balance, 0);
