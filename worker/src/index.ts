/**
 * ChristadoreOS bank worker.
 *
 * Holds the one credential the app must never see: the SimpleFIN access URL,
 * which carries embedded basic-auth and can read account balances. The browser
 * only ever receives already-fetched balance figures.
 *
 * Routes, all under /bank:
 *   POST /bank/claim      one-time exchange of a SimpleFIN setup token
 *   GET  /bank/balances   current balances for every connected account
 *   POST /bank/disconnect forgets the stored access URL
 */

export interface Env {
  /** KV namespace holding the access URL. */
  BANK: KVNamespace;
  /** Shared household passphrase the app sends on every request. */
  HOUSEHOLD_KEY: string;
  /** Comma-separated origins allowed to call this worker. */
  ALLOWED_ORIGINS: string;
}

const ACCESS_URL_KEY = 'simplefin:access-url';

/**
 * SimpleFIN URLs carry credentials, so plaintext is only acceptable when it
 * cannot leave the machine — i.e. loopback, which is how the worker is
 * exercised locally. Everything else must be https.
 */
function isSafeCredentialUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
}

/* ------------------------------------------------------------------ */
/* SimpleFIN response shapes — only the fields we read                 */
/* ------------------------------------------------------------------ */

interface SimpleFinOrg {
  name?: string;
  domain?: string;
}

interface SimpleFinAccount {
  id?: string;
  name?: string;
  currency?: string;
  /** Decimal string, e.g. "1234.56". */
  balance?: string;
  'available-balance'?: string;
  /** Unix seconds. */
  'balance-date'?: number;
  org?: SimpleFinOrg;
}

interface SimpleFinAccountSet {
  errors?: string[];
  accounts?: SimpleFinAccount[];
}

/** What the app receives. Deliberately no credentials, no transactions. */
interface BalanceRow {
  id: string;
  name: string;
  org: string;
  balance: number;
  availableBalance: number | null;
  currency: string;
  asOf: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  // Echo the caller's origin only when it is on the list, so a stray site
  // cannot read responses even if it knows the household key.
  const allow = origin && allowed.includes(origin) ? origin : allowed[0] ?? '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Household-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/** Constant-time-ish comparison, so the key cannot be guessed by timing. */
function keyMatches(supplied: string | null, expected: string): boolean {
  if (!supplied || !expected || supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i += 1) {
    diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

const toNumber = (value: string | undefined): number | null => {
  if (value === undefined) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function toBalanceRows(data: SimpleFinAccountSet): BalanceRow[] {
  return (data.accounts ?? []).map((account, index) => ({
    id: account.id ?? `account-${index}`,
    name: account.name ?? 'Account',
    org: account.org?.name ?? account.org?.domain ?? '',
    balance: toNumber(account.balance) ?? 0,
    availableBalance: toNumber(account['available-balance']),
    currency: account.currency ?? 'USD',
    asOf: (account['balance-date'] ?? Math.floor(Date.now() / 1000)) * 1000,
  }));
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

/**
 * SimpleFIN setup tokens are base64 of a one-time claim URL. POSTing to it
 * returns the long-lived access URL, which is what we keep.
 */
async function claim(request: Request, env: Env, headers: Record<string, string>): Promise<Response> {
  let setupToken = '';
  try {
    const body: unknown = await request.json();
    if (typeof body === 'object' && body !== null) {
      const value = (body as { setupToken?: unknown }).setupToken;
      if (typeof value === 'string') setupToken = value.trim();
    }
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400, headers);
  }
  if (!setupToken) return json({ error: 'Paste your SimpleFIN setup token.' }, 400, headers);

  let claimUrl: string;
  try {
    claimUrl = atob(setupToken);
  } catch {
    return json({ error: 'That does not look like a SimpleFIN setup token.' }, 400, headers);
  }
  if (!isSafeCredentialUrl(claimUrl)) {
    return json({ error: 'That token did not decode to a secure claim URL.' }, 400, headers);
  }

  const claimed = await fetch(claimUrl, { method: 'POST' });
  if (!claimed.ok) {
    // A token can only be claimed once; a second attempt lands here.
    return json(
      {
        error:
          claimed.status === 403
            ? 'That setup token has already been used. Generate a fresh one in SimpleFIN.'
            : `SimpleFIN rejected the token (${claimed.status}).`,
      },
      502,
      headers,
    );
  }

  const accessUrl = (await claimed.text()).trim();
  if (!isSafeCredentialUrl(accessUrl)) {
    return json({ error: 'SimpleFIN returned an unexpected access URL.' }, 502, headers);
  }

  await env.BANK.put(ACCESS_URL_KEY, accessUrl);
  return json({ connected: true }, 200, headers);
}

async function balances(env: Env, headers: Record<string, string>): Promise<Response> {
  const accessUrl = await env.BANK.get(ACCESS_URL_KEY);
  if (!accessUrl) return json({ connected: false, accounts: [] }, 200, headers);

  // balances-only keeps the response small and skips transaction history we
  // have no use for.
  const response = await fetch(`${accessUrl}/accounts?balances-only=1`, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 401 || response.status === 403) {
    return json(
      { connected: false, accounts: [], error: 'SimpleFIN access was revoked. Reconnect in Settings.' },
      200,
      headers,
    );
  }
  if (!response.ok) {
    return json({ error: `SimpleFIN request failed (${response.status}).` }, 502, headers);
  }

  const data = (await response.json()) as SimpleFinAccountSet;
  return json(
    {
      connected: true,
      accounts: toBalanceRows(data),
      // SimpleFIN reports per-institution problems here rather than failing.
      warnings: data.errors ?? [],
      fetchedAt: Date.now(),
    },
    200,
    headers,
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const headers = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    if (path === '/bank/health') return json({ ok: true }, 200, headers);

    if (!keyMatches(request.headers.get('X-Household-Key'), env.HOUSEHOLD_KEY)) {
      return json({ error: 'Wrong household key.' }, 401, headers);
    }

    // Anything thrown past here must still carry CORS headers, or the browser
    // reports an opaque cross-origin failure instead of the real cause.
    try {
      if (path === '/bank/claim' && request.method === 'POST') return await claim(request, env, headers);
      if (path === '/bank/balances' && request.method === 'GET') return await balances(env, headers);
      if (path === '/bank/disconnect' && request.method === 'POST') {
        await env.BANK.delete(ACCESS_URL_KEY);
        return json({ connected: false }, 200, headers);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unexpected worker error.';
      return json({ error: `Worker error: ${message}` }, 502, headers);
    }

    return json({ error: 'Not found.' }, 404, headers);
  },
};
