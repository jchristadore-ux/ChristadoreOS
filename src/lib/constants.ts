import type { BillCategory, EventColor, ExpenseCategory, GroceryCategory, RepeatRule } from './storage';

interface ColorTokens {
  /** Solid fill for dots and chips. */
  dot: string;
  /** Soft tinted card background. */
  soft: string;
  /** Border that pairs with `soft`. */
  border: string;
  /** Readable text on `soft`. */
  text: string;
  /** Raw hex, for recharts and inline styles. */
  hex: string;
  label: string;
}

export const EVENT_COLORS: Record<EventColor, ColorTokens> = {
  // Keys are persisted on existing records, so they stay put — only the values
  // move to the ChristadoreOS palette. `clay` is the default for new records,
  // which is why it carries the brand violet.
  clay: {
    dot: 'bg-[#6D4FEC]',
    soft: 'bg-[#F2EFFE]',
    border: 'border-[#C7BAFA]',
    text: 'text-[#3F1FBE]',
    hex: '#6D4FEC',
    label: 'Iris',
  },
  sage: {
    dot: 'bg-[#0FB39A]',
    soft: 'bg-[#E6F8F4]',
    border: 'border-[#A8E5D8]',
    text: 'text-[#0A7264]',
    hex: '#0FB39A',
    label: 'Teal',
  },
  sky: {
    dot: 'bg-[#07BCF1]',
    soft: 'bg-[#E3F7FE]',
    border: 'border-[#A5E5F9]',
    text: 'text-[#0A6E8F]',
    hex: '#07BCF1',
    label: 'Sky',
  },
  plum: {
    dot: 'bg-[#A855F7]',
    soft: 'bg-[#F7EDFE]',
    border: 'border-[#DFBDFB]',
    text: 'text-[#6B21A8]',
    hex: '#A855F7',
    label: 'Violet',
  },
  honey: {
    dot: 'bg-[#F59E0B]',
    soft: 'bg-[#FEF4E2]',
    border: 'border-[#F8DBA0]',
    text: 'text-[#92620A]',
    hex: '#F59E0B',
    label: 'Amber',
  },
  rose: {
    dot: 'bg-[#F43F5E]',
    soft: 'bg-[#FEECEF]',
    border: 'border-[#FBC2CC]',
    text: 'text-[#9F1239]',
    hex: '#F43F5E',
    label: 'Rose',
  },
};

export const EVENT_COLOR_KEYS = Object.keys(EVENT_COLORS) as EventColor[];

export const GROCERY_CATEGORIES: GroceryCategory[] = [
  'Produce',
  'Dairy',
  'Meat',
  'Frozen',
  'Pantry',
  'Bakery',
  'Household',
  'Other',
];

export const GROCERY_CATEGORY_EMOJI: Record<GroceryCategory, string> = {
  Produce: '🥬',
  Dairy: '🥛',
  Meat: '🍗',
  Frozen: '🧊',
  Pantry: '🥫',
  Bakery: '🥖',
  Household: '🧻',
  Other: '🛒',
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Groceries',
  'Dining',
  'Gas',
  'Kids',
  'Household',
  'Fun',
  'Other',
];

export const EXPENSE_CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  Groceries: '#0FB39A',
  Dining: '#6D4FEC',
  Gas: '#07BCF1',
  Kids: '#F59E0B',
  Household: '#A855F7',
  Fun: '#F43F5E',
  Other: '#7C859F',
};

export const REPEAT_LABELS: Record<RepeatRule, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekdays: 'Weekdays (Mon–Fri)',
  weekly: 'Every week',
  monthly: 'Every month',
};

export const MEMBER_EMOJI = ['🙂', '🧑', '👩', '👨', '🧒', '👶', '🐶', '🐱', '⭐️', '🌻'];

export const BILL_CATEGORIES: BillCategory[] = [
  'Housing',
  'Utilities',
  'Insurance',
  'Debt',
  'Subscriptions',
  'Childcare',
  'Other',
];

export const BILL_CATEGORY_EMOJI: Record<BillCategory, string> = {
  Housing: '🏠',
  Utilities: '💡',
  Insurance: '🛡️',
  Debt: '💳',
  Subscriptions: '🔁',
  Childcare: '🧸',
  Other: '📄',
};

export const BILL_CATEGORY_COLOR: Record<BillCategory, string> = {
  Housing: '#6D4FEC',
  Utilities: '#07BCF1',
  Insurance: '#0FB39A',
  Debt: '#F43F5E',
  Subscriptions: '#A855F7',
  Childcare: '#F59E0B',
  Other: '#7C859F',
};
