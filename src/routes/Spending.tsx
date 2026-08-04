import { useMemo, useState } from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  format,
} from 'date-fns';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/AppShell';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Segmented } from '../components/ui/Segmented';
import { Sheet } from '../components/ui/Sheet';
import { FieldRow, Input, Select, Textarea } from '../components/ui/Field';
import { MemberSelect } from '../components/MemberPicker';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLOR } from '../lib/constants';
import { formatMoney, formatMoneyShort, fromDateKey, toDateKey } from '../lib/format';
import type { Expense, ExpenseCategory, Member } from '../lib/storage';
import { useCollection } from '../lib/storage/useCollection';
import { useAppSettings } from '../lib/useSettings';

type Range = 'today' | 'week' | 'month';

const RANGE_OPTIONS: Array<{ value: Range; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

interface Draft {
  amount: string;
  category: ExpenseCategory;
  note: string;
  date: string;
  memberId: string;
}

const emptyDraft = (): Draft => ({
  amount: '',
  category: 'Groceries',
  note: '',
  date: toDateKey(new Date()),
  memberId: '',
});

function rangeInterval(range: Range, now: Date): { start: Date; end: Date } {
  if (range === 'today') return { start: startOfDay(now), end: now };
  if (range === 'week') {
    return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
  }
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export default function Spending() {
  const { items: expenses, create, update, remove } = useCollection<Expense>('expenses');
  const { items: members } = useCollection<Member>('members');
  const { settings } = useAppSettings();

  const [range, setRange] = useState<Range>('today');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const now = useMemo(() => new Date(), []);
  const interval = useMemo(() => rangeInterval(range, now), [range, now]);

  const inRange = useMemo(
    () =>
      expenses
        .filter((expense) =>
          isWithinInterval(fromDateKey(expense.date), {
            start: startOfDay(interval.start),
            end: interval.end,
          }),
        )
        .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date))),
    [expenses, interval],
  );

  const total = useMemo(() => inRange.reduce((sum, expense) => sum + expense.amount, 0), [inRange]);

  const byCategory = useMemo(() => {
    const totals = EXPENSE_CATEGORIES.map((category) => ({
      category,
      amount: inRange
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0),
    })).filter((entry) => entry.amount > 0);
    return totals.sort((a, b) => b.amount - a.amount);
  }, [inRange]);

  const maxCategory = byCategory[0]?.amount ?? 0;

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(startOfDay(now), 29), end: startOfDay(now) });
    return days.map((day) => {
      const key = toDateKey(day);
      return {
        key,
        label: format(day, 'MMM d'),
        short: format(day, 'd'),
        total: expenses
          .filter((expense) => expense.date === key)
          .reduce((sum, expense) => sum + expense.amount, 0),
      };
    });
  }, [expenses, now]);

  const todayTotal = useMemo(() => {
    const key = toDateKey(now);
    return expenses
      .filter((expense) => expense.date === key)
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses, now]);

  const budgetPct = settings.dailyBudget > 0 ? (todayTotal / settings.dailyBudget) * 100 : 0;

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSheetOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setDraft({
      amount: String(expense.amount),
      category: expense.category,
      note: expense.note,
      date: expense.date,
      memberId: expense.memberId,
    });
    setSheetOpen(true);
  };

  const submit = async () => {
    const amount = Number.parseFloat(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const payload = {
      amount: Math.round(amount * 100) / 100,
      category: draft.category,
      note: draft.note.trim(),
      date: draft.date,
      memberId: draft.memberId,
    };
    if (editingId) {
      await update(editingId, payload);
    } else {
      await create(payload);
    }
    setSheetOpen(false);
  };

  const memberFor = (id: string): Member | undefined => members.find((member) => member.id === id);

  return (
    <>
      <PageHeader
        title="Spending"
        subtitle="What the household is actually spending"
        action={
          <Button size="sm" onClick={openNew}>
            <Plus size={18} />
            Log
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex justify-center md:justify-start">
          <Segmented value={range} options={RANGE_OPTIONS} onChange={setRange} label="Date range" />
        </div>

        <Card>
          <p className="text-sm font-semibold text-ink-400">
            {range === 'today' ? 'Spent today' : range === 'week' ? 'Spent this week' : 'Spent this month'}
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-ink-700">
            {formatMoney(total)}
          </p>
          {range === 'today' && settings.dailyBudget > 0 ? (
            <div className="mt-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink-400">
                  Daily budget {formatMoneyShort(settings.dailyBudget)}
                </span>
                <span
                  className={
                    budgetPct > 100
                      ? 'font-semibold text-red-600'
                      : budgetPct >= 80
                        ? 'font-semibold text-amber-600'
                        : 'font-semibold text-ink-500'
                  }
                >
                  {Math.round(budgetPct)}%
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetPct > 100 ? 'bg-red-500' : budgetPct >= 80 ? 'bg-amber-500' : 'bg-clay-400'
                  }`}
                  style={{ width: `${Math.min(100, budgetPct)}%` }}
                />
              </div>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="By category" />
          {byCategory.length === 0 ? (
            <EmptyState emoji="🧾" title="Nothing logged yet" hint="Log an expense and it shows up here." />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {byCategory.map((entry) => (
                <li key={entry.category}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold text-ink-600">{entry.category}</span>
                    <span className="tabular-nums text-ink-500">{formatMoney(entry.amount)}</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-sand-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${maxCategory > 0 ? (entry.amount / maxCategory) * 100 : 0}%`,
                        backgroundColor: EXPENSE_CATEGORY_COLOR[entry.category],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Last 30 days" />
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#E9E1D5" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="short"
                  tick={{ fill: '#8B8279', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E9E1D5' }}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: '#8B8279', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(value: number) => formatMoneyShort(value)}
                />
                <Tooltip
                  formatter={(value: number) => [formatMoney(value), 'Spent']}
                  labelFormatter={(_label: string, payload) => payload?.[0]?.payload.label ?? ''}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #E9E1D5',
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#C2703D"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title={`${inRange.length} ${inRange.length === 1 ? 'entry' : 'entries'}`} />
          {inRange.length === 0 ? (
            <EmptyState
              emoji="🌿"
              title="A quiet stretch"
              hint="No spending recorded in this range."
              action={
                <Button size="sm" onClick={openNew}>
                  <Plus size={18} />
                  Log an expense
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-sand-100">
              {inRange.map((expense) => {
                const member = memberFor(expense.memberId);
                return (
                  <li key={expense.id} className="flex items-center gap-3 py-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: EXPENSE_CATEGORY_COLOR[expense.category] }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-700">
                        {expense.note || expense.category}
                      </p>
                      <p className="text-xs text-ink-400">
                        {format(fromDateKey(expense.date), 'EEE, MMM d')} · {expense.category}
                        {member ? ` · ${member.emoji} ${member.name}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums font-semibold text-ink-700">
                      {formatMoney(expense.amount)}
                    </span>
                    <IconButton label={`Edit ${expense.category} expense`} onClick={() => openEdit(expense)}>
                      <Pencil size={16} />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Edit expense' : 'Log an expense'}
        footer={
          <div className="flex gap-3">
            {editingId ? (
              <Button
                variant="secondary"
                onClick={async () => {
                  await remove(editingId);
                  setSheetOpen(false);
                }}
              >
                <Trash2 size={18} />
                Delete
              </Button>
            ) : null}
            <Button full onClick={() => void submit()} disabled={!draft.amount.trim()}>
              {editingId ? 'Save changes' : 'Add expense'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Amount"
            inputMode="decimal"
            autoFocus
            value={draft.amount}
            onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
            placeholder="24.50"
          />
          <FieldRow>
            <Select
              label="Category"
              value={draft.category}
              onChange={(event) =>
                setDraft({ ...draft, category: event.target.value as ExpenseCategory })
              }
              options={EXPENSE_CATEGORIES.map((category) => ({ value: category, label: category }))}
            />
            <Input
              label="Date"
              type="date"
              value={draft.date}
              onChange={(event) => setDraft({ ...draft, date: event.target.value })}
            />
          </FieldRow>
          <Textarea
            label="Note"
            hint="Optional"
            rows={2}
            value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            placeholder="Corner market"
          />
          <MemberSelect
            members={members}
            value={draft.memberId}
            onChange={(memberId) => setDraft({ ...draft, memberId })}
            emptyLabel="Household"
          />
        </div>
      </Sheet>
    </>
  );
}
