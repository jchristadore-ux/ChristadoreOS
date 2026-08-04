import { addDays, format, parseISO } from 'date-fns';
import { storage, type FamilyEvent } from './storage';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const TOKEN_KEY = 'familyos:google:token';
const API = 'https://www.googleapis.com/calendar/v3';

/** Days of calendar to pull forward from now. */
export const SYNC_WINDOW_DAYS = 60;

/** How stale the cache may get before an app-open triggers a refresh. */
export const CACHE_TTL_MS = 15 * 60 * 1000;

export const isGoogleConfigured = (): boolean => CLIENT_ID.trim().length > 0;

export interface GoogleCalendarSummary {
  id: string;
  name: string;
  primary: boolean;
}

interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

/* ------------------------------------------------------------------ */
/* Token — memory first, sessionStorage as the only persistence.       */
/* ------------------------------------------------------------------ */

let memoryToken: StoredToken | null = null;

function readToken(): StoredToken | null {
  if (memoryToken && memoryToken.expiresAt > Date.now()) return memoryToken;
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as StoredToken).accessToken === 'string' &&
      typeof (parsed as StoredToken).expiresAt === 'number'
    ) {
      const token = parsed as StoredToken;
      if (token.expiresAt > Date.now()) {
        memoryToken = token;
        return token;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function writeToken(token: StoredToken | null): void {
  memoryToken = token;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sessionStorage can be unavailable; the in-memory token still works for
    // the life of the page.
  }
}

export const hasGoogleToken = (): boolean => readToken() !== null;

/* ------------------------------------------------------------------ */
/* Google Identity Services                                            */
/* ------------------------------------------------------------------ */

let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;

  gisPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisPromise = null;
      reject(new Error('Could not load Google Identity Services'));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

/**
 * Implicit-flow token request. Opens Google's popup, resolves with an access
 * token that lives in memory + sessionStorage and expires on its own.
 */
export async function connectGoogle(): Promise<void> {
  if (!isGoogleConfigured()) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');
  await loadGis();

  const oauth2 = window.google?.accounts.oauth2;
  if (!oauth2) throw new Error('Google Identity Services is unavailable');

  await new Promise<void>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description ?? response.error ?? 'Authorization failed'));
          return;
        }
        writeToken({
          accessToken: response.access_token,
          // Expire a minute early so an in-flight request never dies mid-sync.
          expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000 - 60_000,
        });
        resolve();
      },
      error_callback: (error) => reject(new Error(error.message ?? 'Authorization was dismissed')),
    });
    client.requestAccessToken();
  });
}

export function disconnectGoogle(): void {
  const token = readToken();
  if (token && window.google?.accounts.oauth2) {
    window.google.accounts.oauth2.revoke(token.accessToken);
  }
  writeToken(null);
}

/* ------------------------------------------------------------------ */
/* Calendar REST API                                                   */
/* ------------------------------------------------------------------ */

interface CalendarListEntry {
  id?: string;
  summary?: string;
  summaryOverride?: string;
  primary?: boolean;
  deleted?: boolean;
}

interface CalendarListResponse {
  items?: CalendarListEntry[];
}

interface GoogleEventTime {
  date?: string;
  dateTime?: string;
}

interface GoogleEventEntry {
  id?: string;
  summary?: string;
  location?: string;
  description?: string;
  status?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
}

interface GoogleEventsResponse {
  items?: GoogleEventEntry[];
}

async function apiGet<T>(path: string): Promise<T> {
  const token = readToken();
  if (!token) throw new Error('Not connected to Google');

  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });

  if (response.status === 401 || response.status === 403) {
    writeToken(null);
    throw new Error('Google access expired — reconnect in Settings.');
  }
  if (!response.ok) throw new Error(`Google Calendar request failed (${response.status})`);

  return (await response.json()) as T;
}

export async function listGoogleCalendars(): Promise<GoogleCalendarSummary[]> {
  const data = await apiGet<CalendarListResponse>('/users/me/calendarList?minAccessRole=reader');
  return (data.items ?? [])
    .filter((entry): entry is CalendarListEntry & { id: string } =>
      Boolean(entry.id) && !entry.deleted,
    )
    .map((entry) => ({
      id: entry.id,
      name: entry.summaryOverride ?? entry.summary ?? entry.id,
      primary: entry.primary === true,
    }));
}

/** The primary calendar's id is the account's email address. */
export async function getConnectedEmail(): Promise<string> {
  const calendars = await listGoogleCalendars();
  return calendars.find((calendar) => calendar.primary)?.id ?? '';
}

function toEvent(entry: GoogleEventEntry, calendarId: string, calendarName: string): FamilyEvent | null {
  if (!entry.id || entry.status === 'cancelled') return null;

  const startDate = entry.start?.date;
  const startDateTime = entry.start?.dateTime;
  if (!startDate && !startDateTime) return null;

  const allDay = Boolean(startDate);
  const start = allDay ? parseISO(`${startDate}T00:00:00`) : parseISO(startDateTime ?? '');
  if (Number.isNaN(start.getTime())) return null;

  const endRaw = entry.end?.dateTime;
  const end = endRaw ? parseISO(endRaw) : null;
  const now = Date.now();

  return {
    // Deterministic id so re-syncing overwrites rather than duplicates.
    id: `google:${calendarId}:${entry.id}`,
    createdAt: now,
    updatedAt: now,
    title: entry.summary ?? '(no title)',
    date: format(start, 'yyyy-MM-dd'),
    startTime: allDay ? '' : format(start, 'HH:mm'),
    endTime: end && !Number.isNaN(end.getTime()) && !allDay ? format(end, 'HH:mm') : '',
    allDay,
    location: entry.location ?? '',
    notes: entry.description ?? '',
    color: 'sky',
    memberIds: [],
    source: 'google',
    calendarId,
    calendarName,
  };
}

/**
 * Pulls the next 60 days from the selected calendars and writes them through
 * the storage adapter, replacing whatever was cached before. Returns how many
 * events landed.
 */
export async function syncGoogleEvents(calendars: GoogleCalendarSummary[]): Promise<number> {
  const timeMin = new Date().toISOString();
  const timeMax = addDays(new Date(), SYNC_WINDOW_DAYS).toISOString();

  const fetched: FamilyEvent[] = [];
  for (const calendar of calendars) {
    const query = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });
    const data = await apiGet<GoogleEventsResponse>(
      `/calendars/${encodeURIComponent(calendar.id)}/events?${query.toString()}`,
    );
    for (const entry of data.items ?? []) {
      const event = toEvent(entry, calendar.id, calendar.name);
      if (event) fetched.push(event);
    }
  }

  const existing = await storage.list<FamilyEvent>('events');
  for (const event of existing) {
    if (event.source === 'google') await storage.remove('events', event.id);
  }
  for (const event of fetched) {
    await storage.put<FamilyEvent>('events', event);
  }
  return fetched.length;
}

/** Drops cached Google events without touching anything the family typed. */
export async function clearGoogleEvents(): Promise<void> {
  const existing = await storage.list<FamilyEvent>('events');
  for (const event of existing) {
    if (event.source === 'google') await storage.remove('events', event.id);
  }
}
