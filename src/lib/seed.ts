import { addDays, addHours, setHours, setMinutes, startOfDay, subDays } from 'date-fns';
import {
  clearAllLocalData,
  storage,
  DEFAULT_SETTINGS,
  SETTINGS_ID,
  type AppSettings,
  type Countdown,
  type Expense,
  type ExpenseCategory,
  type FamilyEvent,
  type GroceryCategory,
  type GroceryItem,
  type Member,
  type Reminder,
} from './storage';
import { createId } from './storage/useCollection';
import { toDateKey } from './format';

const stamp = (offsetMinutes = 0): number => Date.now() - offsetMinutes * 60_000;

function makeMembers(): Member[] {
  const now = stamp(60);
  return [
    { id: createId(), createdAt: now, updatedAt: now, name: 'Me', color: 'clay', emoji: '🙂' },
    { id: createId(), createdAt: now, updatedAt: now, name: 'Sam', color: 'sage', emoji: '🧑' },
    { id: createId(), createdAt: now, updatedAt: now, name: 'Nora', color: 'plum', emoji: '🧒' },
  ];
}

function makeGroceries(): GroceryItem[] {
  const rows: Array<[string, string, GroceryCategory, boolean]> = [
    ['Bananas', '1 bunch', 'Produce', false],
    ['Baby spinach', '', 'Produce', false],
    ['Roma tomatoes', '4', 'Produce', false],
    ['Whole milk', '1 gal', 'Dairy', false],
    ['Greek yogurt', '', 'Dairy', false],
    ['Sharp cheddar', '', 'Dairy', true],
    ['Chicken thighs', '2 lb', 'Meat', false],
    ['Frozen peas', '', 'Frozen', false],
    ['Olive oil', '', 'Pantry', false],
    ['Black beans', '2 cans', 'Pantry', false],
    ['Sourdough loaf', '', 'Bakery', false],
    ['Paper towels', '', 'Household', true],
    ['Dish soap', '', 'Household', false],
  ];
  return rows.map(([name, quantity, category, checked], index) => {
    const now = stamp(rows.length - index);
    return { id: createId(), createdAt: now, updatedAt: now, name, quantity, category, checked };
  });
}

function makeExpenses(memberIds: string[]): Expense[] {
  // A believable 30 days: most days have one or two entries, a few are quiet.
  const plan: Array<[number, number, ExpenseCategory, string]> = [
    [0, 42.18, 'Groceries', 'Corner market'],
    [0, 6.75, 'Dining', 'Coffee + scone'],
    [1, 58.4, 'Gas', ''],
    [1, 24.99, 'Kids', 'Soccer socks'],
    [2, 112.35, 'Groceries', 'Big shop'],
    [3, 31.2, 'Dining', 'Taco night'],
    [4, 18.0, 'Fun', 'Matinee'],
    [5, 76.12, 'Household', 'Filters + bulbs'],
    [6, 9.5, 'Dining', ''],
    [7, 64.83, 'Groceries', ''],
    [8, 52.1, 'Gas', ''],
    [9, 15.25, 'Kids', 'Book fair'],
    [10, 38.9, 'Dining', 'Pizza + salad'],
    [11, 88.44, 'Groceries', ''],
    [12, 22.0, 'Fun', 'Mini golf'],
    [14, 47.6, 'Household', 'Storage bins'],
    [15, 71.05, 'Groceries', ''],
    [16, 12.4, 'Dining', ''],
    [17, 55.3, 'Gas', ''],
    [18, 29.99, 'Kids', 'Swim goggles'],
    [19, 94.16, 'Groceries', 'Restock'],
    [21, 34.5, 'Dining', 'Brunch'],
    [22, 19.99, 'Fun', 'Board game'],
    [23, 61.77, 'Groceries', ''],
    [24, 43.2, 'Household', ''],
    [26, 57.85, 'Gas', ''],
    [27, 82.4, 'Groceries', ''],
    [28, 16.5, 'Dining', ''],
    [29, 27.3, 'Kids', 'Art supplies'],
  ];
  const today = startOfDay(new Date());
  return plan.map(([daysAgo, amount, category, note], index) => {
    const now = stamp(plan.length - index);
    return {
      id: createId(),
      createdAt: now,
      updatedAt: now,
      amount,
      category,
      note,
      date: toDateKey(subDays(today, daysAgo)),
      memberId: memberIds[index % memberIds.length] ?? '',
    };
  });
}

function makeEvents(members: Member[]): FamilyEvent[] {
  const today = startOfDay(new Date());
  const [me, sam, nora] = members;
  const idsOf = (...list: Array<Member | undefined>): string[] =>
    list.filter((m): m is Member => Boolean(m)).map((m) => m.id);

  const rows: Array<Omit<FamilyEvent, 'id' | 'createdAt' | 'updatedAt' | 'source'>> = [
    {
      title: 'School drop-off',
      date: toDateKey(today),
      startTime: '08:10',
      endTime: '08:30',
      allDay: false,
      location: 'Lincoln Elementary',
      notes: '',
      color: 'sky',
      memberIds: idsOf(me, nora),
    },
    {
      title: 'Dentist — Nora',
      date: toDateKey(today),
      startTime: '15:30',
      endTime: '16:15',
      allDay: false,
      location: 'Maple Dental',
      notes: 'Bring the insurance card.',
      color: 'plum',
      memberIds: idsOf(nora),
    },
    {
      title: 'Family dinner',
      date: toDateKey(today),
      startTime: '18:30',
      endTime: '19:30',
      allDay: false,
      location: '',
      notes: '',
      color: 'clay',
      memberIds: idsOf(me, sam, nora),
    },
    {
      title: 'Soccer practice',
      date: toDateKey(addDays(today, 1)),
      startTime: '17:00',
      endTime: '18:30',
      allDay: false,
      location: 'Riverside Field 3',
      notes: '',
      color: 'sage',
      memberIds: idsOf(nora),
    },
    {
      title: 'Grocery run',
      date: toDateKey(addDays(today, 2)),
      startTime: '10:00',
      endTime: '11:00',
      allDay: false,
      location: '',
      notes: '',
      color: 'honey',
      memberIds: idsOf(sam),
    },
    {
      title: 'Library books due',
      date: toDateKey(addDays(today, 4)),
      startTime: '',
      endTime: '',
      allDay: true,
      location: '',
      notes: '3 picture books + 1 novel',
      color: 'rose',
      memberIds: idsOf(me),
    },
    {
      title: 'Sam — work offsite',
      date: toDateKey(addDays(today, 6)),
      startTime: '',
      endTime: '',
      allDay: true,
      location: 'Downtown',
      notes: '',
      color: 'sky',
      memberIds: idsOf(sam),
    },
    {
      title: 'Movie night',
      date: toDateKey(addDays(today, 9)),
      startTime: '19:00',
      endTime: '21:00',
      allDay: false,
      location: 'Living room',
      notes: "Nora's pick this time.",
      color: 'plum',
      memberIds: idsOf(me, sam, nora),
    },
    {
      title: 'Parent–teacher conference',
      date: toDateKey(addDays(today, 12)),
      startTime: '16:00',
      endTime: '16:20',
      allDay: false,
      location: 'Room 12',
      notes: '',
      color: 'clay',
      memberIds: idsOf(me, sam),
    },
  ];

  return rows.map((row, index) => {
    const now = stamp(rows.length - index);
    return { ...row, id: createId(), createdAt: now, updatedAt: now, source: 'manual' as const };
  });
}

function makeCountdowns(): Countdown[] {
  const today = startOfDay(new Date());
  const rows: Array<[string, Date, string, Countdown['color']]> = [
    ['Beach trip', setHours(addDays(today, 23), 9), '🏖️', 'sky'],
    ["Nora's birthday", setHours(addDays(today, 46), 8), '🎂', 'rose'],
    ['Last day of school', setHours(addDays(today, 71), 15), '🎒', 'sage'],
    ['Anniversary dinner', setHours(subDays(today, 12), 19), '🥂', 'plum'],
  ];
  return rows.map(([title, target, emoji, color], index) => {
    const now = stamp(rows.length - index);
    return {
      id: createId(),
      createdAt: now,
      updatedAt: now,
      title,
      target: setMinutes(target, 0).toISOString(),
      emoji,
      color,
    };
  });
}

function makeReminders(): Reminder[] {
  const today = startOfDay(new Date());
  const soon = addHours(new Date(), 3);
  const rows: Array<[string, Date, string, Reminder['repeat'], boolean]> = [
    ['Take out the trash', setHours(today, 20), '20:00', 'weekly', false],
    ['Nora — vitamins', setHours(today, 8), '08:00', 'daily', false],
    ['Start the dishwasher', soon, `${String(soon.getHours()).padStart(2, '0')}:00`, 'none', true],
    ['Pay the water bill', addDays(today, 3), '09:30', 'monthly', false],
  ];
  return rows.map(([title, date, time, repeat, isAlarm], index) => {
    const now = stamp(rows.length - index);
    return {
      id: createId(),
      createdAt: now,
      updatedAt: now,
      title,
      date: toDateKey(date),
      time,
      repeat,
      isAlarm,
      enabled: true,
      lastFiredAt: 0,
    };
  });
}

async function writeAll(collection: Parameters<typeof storage.put>[0], items: unknown[]) {
  for (const item of items) await storage.put(collection, item);
}

async function seed(): Promise<void> {
  const members = makeMembers();
  await writeAll('members', members);
  await writeAll('groceries', makeGroceries());
  await writeAll(
    'expenses',
    makeExpenses(members.map((m) => m.id)),
  );
  await writeAll('events', makeEvents(members));
  await writeAll('countdowns', makeCountdowns());
  await writeAll('reminders', makeReminders());

  const now = Date.now();
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    seeded: true,
    createdAt: now,
    updatedAt: now,
  };
  await storage.put('settings', settings);
}

/** Runs once, the very first time the app opens on this device. */
export async function ensureSeeded(): Promise<void> {
  const existing = await storage.get<AppSettings>('settings', SETTINGS_ID);
  if (existing?.seeded) return;
  await seed();
}

/** Settings → "Reset demo data": wipes everything and lays the demo down again. */
export async function resetDemoData(): Promise<void> {
  clearAllLocalData();
  await seed();
}
