import type { EventColor, ExpenseCategory, GroceryCategory, RepeatRule } from './storage';

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
  clay: {
    dot: 'bg-[#C2703D]',
    soft: 'bg-[#FBF1EA]',
    border: 'border-[#E8BE9E]',
    text: 'text-[#8A4A24]',
    hex: '#C2703D',
    label: 'Clay',
  },
  sage: {
    dot: 'bg-[#7C9473]',
    soft: 'bg-[#EFF3EC]',
    border: 'border-[#C6D3BF]',
    text: 'text-[#4C6244]',
    hex: '#7C9473',
    label: 'Sage',
  },
  sky: {
    dot: 'bg-[#6B8CAE]',
    soft: 'bg-[#EDF2F7]',
    border: 'border-[#BFD0E0]',
    text: 'text-[#3F5A76]',
    hex: '#6B8CAE',
    label: 'Sky',
  },
  plum: {
    dot: 'bg-[#8E7099]',
    soft: 'bg-[#F3EFF5]',
    border: 'border-[#D2C3D8]',
    text: 'text-[#5D4666]',
    hex: '#8E7099',
    label: 'Plum',
  },
  honey: {
    dot: 'bg-[#D9A441]',
    soft: 'bg-[#FBF3E2]',
    border: 'border-[#EBD3A0]',
    text: 'text-[#8C6316]',
    hex: '#D9A441',
    label: 'Honey',
  },
  rose: {
    dot: 'bg-[#C1707A]',
    soft: 'bg-[#F9EEEF]',
    border: 'border-[#E3C2C6]',
    text: 'text-[#8B4750]',
    hex: '#C1707A',
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
  Groceries: '#7C9473',
  Dining: '#C2703D',
  Gas: '#6B8CAE',
  Kids: '#D9A441',
  Household: '#8E7099',
  Fun: '#C1707A',
  Other: '#9C8B72',
};

export const REPEAT_LABELS: Record<RepeatRule, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekdays: 'Weekdays (Mon–Fri)',
  weekly: 'Every week',
  monthly: 'Every month',
};

export const MEMBER_EMOJI = ['🙂', '🧑', '👩', '👨', '🧒', '👶', '🐶', '🐱', '⭐️', '🌻'];
