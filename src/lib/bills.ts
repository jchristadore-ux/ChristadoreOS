import { format, getDaysInMonth, isBefore, isSameDay, startOfDay } from 'date-fns';
import type { Bill } from './storage';

/** yyyy-MM-dd, the key an individual occurrence is marked paid against. */
export const toDateKey = (date: Date): string => format(date, 'yyyy-MM-dd');

/** Clamps a day-of-month rule to a month that may be shorter than it. */
const clampDay = (day: number, month: Date): number =>
  Math.min(Math.max(1, day), getDaysInMonth(month));

/** The day-of-month rules for a bill, in order. One entry, or two. */
export function dueDaysOf(bill: Bill): number[] {
  const days = [bill.dueDay];
  if (bill.secondDueDay !== null && bill.secondDueDay !== bill.dueDay) {
    days.push(bill.secondDueDay);
  }
  return days.sort((a, b) => a - b);
}

export const isTwiceMonthly = (bill: Bill): boolean => dueDaysOf(bill).length > 1;

/**
 * Every date this bill comes due within `month`. A rule of the 31st still lands
 * in February — on the last day of it.
 */
export function dueDatesIn(bill: Bill, month: Date): Date[] {
  const seen = new Set<number>();
  const dates: Date[] = [];
  for (const rule of dueDaysOf(bill)) {
    const day = clampDay(rule, month);
    // Two rules can collapse onto the same date in a short month (the 30th and
    // the 31st both become Feb 28); that is one payment, not two.
    if (seen.has(day)) continue;
    seen.add(day);
    dates.push(startOfDay(new Date(month.getFullYear(), month.getMonth(), day)));
  }
  return dates;
}

/** What a bill costs across a whole month, counting both occurrences. */
export const monthlyCost = (bill: Bill, month: Date): number =>
  bill.amount * dueDatesIn(bill, month).length;

export type BillStatus = 'paid' | 'overdue' | 'today' | 'upcoming';

export interface BillOccurrence {
  bill: Bill;
  due: Date;
  /** yyyy-MM-dd — the key in `bill.paidDates`. */
  key: string;
  status: BillStatus;
  /** 1-based position when a bill lands more than once in the month. */
  index: number;
  total: number;
}

function statusFor(bill: Bill, due: Date, now: Date, currentMonth: boolean): BillStatus {
  if (bill.paidDates.includes(toDateKey(due))) return 'paid';
  // Overdue and due-today only mean anything against today's date.
  if (!currentMonth) return 'upcoming';
  const today = startOfDay(now);
  if (isSameDay(due, today)) return 'today';
  return isBefore(due, today) ? 'overdue' : 'upcoming';
}

/** Flattens bills into their individual occurrences within a month. */
export function occurrencesIn(
  bills: Bill[],
  month: Date,
  now: Date,
  currentMonth: boolean,
): BillOccurrence[] {
  const rows: BillOccurrence[] = [];
  for (const bill of bills) {
    const dates = dueDatesIn(bill, month);
    dates.forEach((due, i) => {
      rows.push({
        bill,
        due,
        key: toDateKey(due),
        status: statusFor(bill, due, now, currentMonth),
        index: i + 1,
        total: dates.length,
      });
    });
  }
  return rows.sort((a, b) => {
    if (a.bill.active !== b.bill.active) return a.bill.active ? -1 : 1;
    return a.due.getTime() - b.due.getTime();
  });
}

/** Active occurrences due today and not yet marked paid. Drives the Today card. */
export const occurrencesDueToday = (bills: Bill[], now: Date): BillOccurrence[] =>
  occurrencesIn(bills.filter((bill) => bill.active), now, now, true)
    .filter((row) => row.status === 'today')
    .sort((a, b) => b.bill.amount - a.bill.amount);

/** Active occurrences whose date has passed this month with nothing recorded. */
export const occurrencesOverdue = (bills: Bill[], now: Date): BillOccurrence[] =>
  occurrencesIn(bills.filter((bill) => bill.active), now, now, true).filter(
    (row) => row.status === 'overdue',
  );

export interface MonthTotals {
  total: number;
  paid: number;
  remaining: number;
}

export function monthTotals(bills: Bill[], month: Date, now: Date, currentMonth: boolean): MonthTotals {
  const rows = occurrencesIn(
    bills.filter((bill) => bill.active),
    month,
    now,
    currentMonth,
  );
  const total = rows.reduce((sum, row) => sum + row.bill.amount, 0);
  const paid = rows
    .filter((row) => row.status === 'paid')
    .reduce((sum, row) => sum + row.bill.amount, 0);
  return { total, paid, remaining: total - paid };
}

/** Adds or removes one occurrence's key, leaving every other date untouched. */
export function togglePaidDates(bill: Bill, due: Date): string[] {
  const key = toDateKey(due);
  return bill.paidDates.includes(key)
    ? bill.paidDates.filter((entry) => entry !== key)
    : [...bill.paidDates, key];
}
