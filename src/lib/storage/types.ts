export type CollectionName =
  | 'events'
  | 'groceries'
  | 'expenses'
  | 'reminders'
  | 'countdowns'
  | 'members'
  | 'bills'
  | 'settings';

export const COLLECTIONS: CollectionName[] = [
  'events',
  'groceries',
  'expenses',
  'reminders',
  'countdowns',
  'members',
  'bills',
  'settings',
];

/** Every record in every collection carries these. */
export interface BaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface StorageAdapter {
  list<T>(collection: CollectionName): Promise<T[]>;
  get<T>(collection: CollectionName, id: string): Promise<T | null>;
  put<T>(collection: CollectionName, item: T): Promise<void>;
  remove(collection: CollectionName, id: string): Promise<void>;
  subscribe<T>(collection: CollectionName, cb: (items: T[]) => void): () => void;
  mode: 'local' | 'cloud';
}

/* ------------------------------------------------------------------ */
/* Domain records                                                      */
/* ------------------------------------------------------------------ */

export type EventColor = 'clay' | 'sage' | 'sky' | 'plum' | 'honey' | 'rose';

export type EventSource = 'manual' | 'google';

export interface FamilyEvent extends BaseRecord {
  title: string;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm, empty when allDay */
  startTime: string;
  /** HH:mm, empty when allDay */
  endTime: string;
  allDay: boolean;
  location: string;
  notes: string;
  color: EventColor;
  memberIds: string[];
  source: EventSource;
  /** Only set for source === 'google'. */
  calendarId?: string;
  calendarName?: string;
}

export type GroceryCategory =
  | 'Produce'
  | 'Dairy'
  | 'Meat'
  | 'Frozen'
  | 'Pantry'
  | 'Bakery'
  | 'Household'
  | 'Other';

export interface GroceryItem extends BaseRecord {
  name: string;
  quantity: string;
  category: GroceryCategory;
  checked: boolean;
}

export type ExpenseCategory =
  | 'Groceries'
  | 'Dining'
  | 'Gas'
  | 'Kids'
  | 'Household'
  | 'Fun'
  | 'Other';

export interface Expense extends BaseRecord {
  /** Whole dollars and cents, e.g. 12.5 */
  amount: number;
  category: ExpenseCategory;
  note: string;
  /** yyyy-MM-dd */
  date: string;
  memberId: string;
}

export type RepeatRule = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface Reminder extends BaseRecord {
  title: string;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm */
  time: string;
  repeat: RepeatRule;
  /** Alarms also play an audible tone. */
  isAlarm: boolean;
  enabled: boolean;
  /** Epoch ms of the last occurrence already fired, so reloads don't re-fire. */
  lastFiredAt: number;
}

export interface Countdown extends BaseRecord {
  title: string;
  /** ISO date-time string for the target moment. */
  target: string;
  emoji: string;
  color: EventColor;
}

export type BillCategory =
  | 'Housing'
  | 'Utilities'
  | 'Insurance'
  | 'Debt'
  | 'Subscriptions'
  | 'Childcare'
  | 'Other';

export interface Bill extends BaseRecord {
  name: string;
  amount: number;
  /** Day of the month it comes due, 1-31, clamped to short months. */
  dueDay: number;
  /**
   * Second day of the month for bills that land twice a month, such as a
   * mortgage on the 9th and the 23rd. Null for ordinary monthly bills. Each
   * occurrence is charged in full and paid off independently.
   */
  secondDueDay: number | null;
  category: BillCategory;
  /** Pulled automatically, so it only needs watching rather than paying. */
  autopay: boolean;
  memberId: string;
  notes: string;
  /** Paused bills stay on the books but drop out of totals and the dashboard. */
  active: boolean;
  /**
   * yyyy-MM-dd of each occurrence already settled. Keyed by the occurrence
   * rather than the month so a twice-monthly bill can have the 9th paid while
   * the 23rd is still outstanding.
   */
  paidDates: string[];
}

export interface Member extends BaseRecord {
  name: string;
  color: EventColor;
  emoji: string;
}

/**
 * The `settings` collection holds a small number of singleton records, each
 * keyed by a well-known id.
 */
export const SETTINGS_ID = 'app' as const;
export const GOOGLE_CACHE_ID = 'google-cache' as const;

export interface AppSettings extends BaseRecord {
  id: typeof SETTINGS_ID;
  dailyBudget: number;
  /** Google calendar ids the user chose to include. */
  googleCalendarIds: string[];
  /** Set once demo data has been seeded so we never re-seed over real data. */
  seeded: boolean;
}

export interface GoogleCacheMeta extends BaseRecord {
  id: typeof GOOGLE_CACHE_ID;
  /** Epoch ms of the last successful sync, 0 when never synced. */
  lastSyncedAt: number;
  connectedEmail: string;
}

export type SettingsRecord = AppSettings | GoogleCacheMeta;

export const DEFAULT_SETTINGS: Omit<AppSettings, 'createdAt' | 'updatedAt'> = {
  id: SETTINGS_ID,
  dailyBudget: 75,
  googleCalendarIds: [],
  seeded: false,
};
