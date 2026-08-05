import { format, getDaysInMonth, isBefore, isSameDay, startOfDay } from 'date-fns';
import type { Bill } from './storage';

/** yyyy-MM, the key a bill is marked paid against. */
export const toMonthKey = (date: Date): string => format(date, 'yyyy-MM');

/**
 * The date a bill falls due within a given month. A bill due on the 31st still
 * lands in February — on the last day of it.
 */
export function dueDateIn(bill: Bill, month: Date): Date {
  const day = Math.min(Math.max(1, bill.dueDay), getDaysInMonth(month));
  const due = new Date(month.getFullYear(), month.getMonth(), day);
  return startOfDay(due);
}

export const isPaidIn = (bill: Bill, month: Date): boolean =>
  bill.paidMonths.includes(toMonthKey(month));

export type BillStatus = 'paid' | 'overdue' | 'today' | 'upcoming';

export function billStatus(bill: Bill, month: Date, now: Date): BillStatus {
  if (isPaidIn(bill, month)) return 'paid';
  const due = dueDateIn(bill, month);
  const today = startOfDay(now);
  if (isSameDay(due, today)) return 'today';
  return isBefore(due, today) ? 'overdue' : 'upcoming';
}

/** Active bills due today and not yet marked paid. Drives the Today card. */
export function billsDueToday(bills: Bill[], now: Date): Bill[] {
  return bills
    .filter((bill) => bill.active && billStatus(bill, now, now) === 'today')
    .sort((a, b) => b.amount - a.amount);
}

/** Active bills whose due date has passed this month with nothing recorded. */
export function billsOverdue(bills: Bill[], now: Date): Bill[] {
  return bills
    .filter((bill) => bill.active && billStatus(bill, now, now) === 'overdue')
    .sort((a, b) => dueDateIn(a, now).getTime() - dueDateIn(b, now).getTime());
}

export interface MonthTotals {
  total: number;
  paid: number;
  remaining: number;
}

export function monthTotals(bills: Bill[], month: Date): MonthTotals {
  const active = bills.filter((bill) => bill.active);
  const total = active.reduce((sum, bill) => sum + bill.amount, 0);
  const paid = active
    .filter((bill) => isPaidIn(bill, month))
    .reduce((sum, bill) => sum + bill.amount, 0);
  return { total, paid, remaining: total - paid };
}

/** Adds or removes the month key, leaving other months' history untouched. */
export function togglePaidMonths(bill: Bill, month: Date): string[] {
  const key = toMonthKey(month);
  return bill.paidMonths.includes(key)
    ? bill.paidMonths.filter((entry) => entry !== key)
    : [...bill.paidMonths, key];
}
