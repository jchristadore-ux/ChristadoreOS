import { format, isToday, isTomorrow, isYesterday, parse, parseISO } from 'date-fns';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const currencyWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const formatMoney = (amount: number): string => currency.format(amount);

export const formatMoneyShort = (amount: number): string =>
  Number.isInteger(amount) ? currencyWhole.format(amount) : currency.format(amount);

/** yyyy-MM-dd for a Date. The app's canonical date key. */
export const toDateKey = (date: Date): string => format(date, 'yyyy-MM-dd');

/** Parses a yyyy-MM-dd key back into a local Date at midnight. */
export const fromDateKey = (key: string): Date => parse(key, 'yyyy-MM-dd', new Date());

/** Combines a yyyy-MM-dd key and an HH:mm time into a local Date. */
export function combineDateTime(dateKey: string, time: string): Date {
  const base = fromDateKey(dateKey);
  if (!time) return base;
  const [hours, minutes] = time.split(':');
  base.setHours(Number(hours ?? 0), Number(minutes ?? 0), 0, 0);
  return base;
}

/** "2:30 PM" from "14:30". Returns '' for an empty time. */
export function formatTime(time: string): string {
  if (!time) return '';
  return format(parse(time, 'HH:mm', new Date()), 'h:mm a');
}

/** "Today", "Tomorrow", "Yesterday", else "Tue, Mar 4". */
export function friendlyDate(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, MMM d');
}

export const friendlyDateKey = (key: string): string => friendlyDate(fromDateKey(key));

/** Safe parse for stored ISO strings. */
export const parseIso = (value: string): Date => parseISO(value);

export function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
