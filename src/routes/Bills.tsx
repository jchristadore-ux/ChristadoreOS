import { useMemo, useState } from 'react';
import { addMonths, format, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { PageHeader } from '../components/AppShell';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader, EmptyState } from '../components/ui/Card';
import { Sheet } from '../components/ui/Sheet';
import { FieldRow, Input, Select, Textarea, Toggle } from '../components/ui/Field';
import { MemberSelect } from '../components/MemberPicker';
import { BILL_CATEGORIES, BILL_CATEGORY_COLOR, BILL_CATEGORY_EMOJI } from '../lib/constants';
import { formatMoney } from '../lib/format';
import {
  billStatus,
  dueDateIn,
  isPaidIn,
  monthTotals,
  togglePaidMonths,
  type BillStatus,
} from '../lib/bills';
import type { Bill, BillCategory, Member } from '../lib/storage';
import { useCollection } from '../lib/storage/useCollection';

interface Draft {
  name: string;
  amount: string;
  dueDay: string;
  category: BillCategory;
  autopay: boolean;
  memberId: string;
  notes: string;
  active: boolean;
}

const emptyDraft = (): Draft => ({
  name: '',
  amount: '',
  dueDay: '1',
  category: 'Utilities',
  autopay: false,
  memberId: '',
  notes: '',
  active: true,
});

const STATUS_STYLE: Record<BillStatus, { chip: string; label: string }> = {
  paid: { chip: 'bg-emerald-50 text-emerald-700', label: 'Paid' },
  overdue: { chip: 'bg-red-50 text-red-700', label: 'Overdue' },
  today: { chip: 'bg-amber-50 text-amber-700', label: 'Due today' },
  upcoming: { chip: 'bg-mist-100 text-ink-500', label: '' },
};

const ordinal = (day: number): string => {
  const rest = day % 100;
  if (rest >= 11 && rest <= 13) return `${day}th`;
  return `${day}${['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'}`;
};

export default function Bills() {
  const { items: bills, create, update, remove } = useCollection<Bill>('bills');
  const { items: members } = useCollection<Member>('members');

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const now = useMemo(() => new Date(), []);
  const viewingCurrentMonth = isSameMonth(cursor, now);

  const totals = useMemo(() => monthTotals(bills, cursor), [bills, cursor]);

  const rows = useMemo(() => {
    return bills
      .map((bill) => ({
        bill,
        due: dueDateIn(bill, cursor),
        // Status is only meaningful against today for the current month; other
        // months are just paid or not.
        status: viewingCurrentMonth
          ? billStatus(bill, cursor, now)
          : isPaidIn(bill, cursor)
            ? ('paid' as const)
            : ('upcoming' as const),
      }))
      .sort((a, b) => {
        if (a.bill.active !== b.bill.active) return a.bill.active ? -1 : 1;
        return a.due.getTime() - b.due.getTime();
      });
  }, [bills, cursor, now, viewingCurrentMonth]);

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSheetOpen(true);
  };

  const openEdit = (bill: Bill) => {
    setEditingId(bill.id);
    setDraft({
      name: bill.name,
      amount: String(bill.amount),
      dueDay: String(bill.dueDay),
      category: bill.category,
      autopay: bill.autopay,
      memberId: bill.memberId,
      notes: bill.notes,
      active: bill.active,
    });
    setSheetOpen(true);
  };

  const submit = async () => {
    const name = draft.name.trim();
    const amount = Number.parseFloat(draft.amount);
    const dueDay = Number.parseInt(draft.dueDay, 10);
    if (!name || !Number.isFinite(amount) || amount < 0) return;

    const payload = {
      name,
      amount: Math.round(amount * 100) / 100,
      dueDay: Number.isFinite(dueDay) ? Math.min(31, Math.max(1, dueDay)) : 1,
      category: draft.category,
      autopay: draft.autopay,
      memberId: draft.memberId,
      notes: draft.notes.trim(),
      active: draft.active,
    };

    if (editingId) await update(editingId, payload);
    else await create({ ...payload, paidMonths: [] });
    setSheetOpen(false);
  };

  const togglePaid = async (bill: Bill) => {
    await update(bill.id, { paidMonths: togglePaidMonths(bill, cursor) });
  };

  return (
    <>
      <PageHeader
        title="Bills"
        subtitle="What goes out every month"
        action={
          <Button size="sm" onClick={openNew}>
            <Plus size={18} />
            Bill
          </Button>
        }
      />

      <div className="mb-3 flex items-center gap-1">
        <IconButton label="Previous month" onClick={() => setCursor(subMonths(cursor, 1))}>
          <ChevronLeft size={20} />
        </IconButton>
        <span className="min-w-[8.5rem] text-center text-sm font-bold text-ink-600">
          {format(cursor, 'MMMM yyyy')}
        </span>
        <IconButton label="Next month" onClick={() => setCursor(addMonths(cursor, 1))}>
          <ChevronRight size={20} />
        </IconButton>
        {viewingCurrentMonth ? null : (
          <button
            type="button"
            onClick={() => setCursor(startOfMonth(now))}
            className="ml-auto min-h-[44px] px-3 text-sm font-semibold text-iris-500"
          >
            This month
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Card>
          <p className="text-sm font-semibold text-ink-400">Still to pay</p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-ink-700">
            {formatMoney(totals.remaining)}
          </p>
          {totals.total > 0 ? (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist-200">
                <div
                  className="h-full rounded-full bg-iris-400 transition-all"
                  style={{ width: `${Math.min(100, (totals.paid / totals.total) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-400">
                {formatMoney(totals.paid)} paid of {formatMoney(totals.total)} this month
              </p>
            </>
          ) : null}
        </Card>

        <Card className="!p-2">
          <div className="px-2 pt-1">
            <CardHeader title={`${bills.length} ${bills.length === 1 ? 'bill' : 'bills'}`} />
          </div>

          {bills.length === 0 ? (
            <EmptyState
              emoji="📄"
              title="No bills yet"
              hint="Add the rent, the utilities, the subscriptions — anything that repeats monthly."
              action={
                <Button size="sm" onClick={openNew}>
                  <Plus size={18} />
                  Add a bill
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-1">
              {rows.map(({ bill, due, status }) => {
                const style = STATUS_STYLE[status];
                const member = members.find((entry) => entry.id === bill.memberId);
                return (
                  <li
                    key={bill.id}
                    className={`flex items-center gap-3 rounded-2xl px-2 py-2 ${
                      bill.active ? '' : 'opacity-50'
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={
                        status === 'paid'
                          ? `Mark ${bill.name} unpaid for ${format(cursor, 'MMMM')}`
                          : `Mark ${bill.name} paid for ${format(cursor, 'MMMM')}`
                      }
                      aria-pressed={status === 'paid'}
                      onClick={() => void togglePaid(bill)}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        status === 'paid'
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-mist-300 bg-white text-transparent hover:border-iris-300'
                      }`}
                    >
                      <Check size={20} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span aria-hidden="true">{BILL_CATEGORY_EMOJI[bill.category]}</span>
                        <span
                          className={`truncate font-semibold ${
                            status === 'paid' ? 'text-ink-400 line-through' : 'text-ink-700'
                          }`}
                        >
                          {bill.name}
                        </span>
                        {bill.autopay ? (
                          <Zap size={13} className="shrink-0 text-iris-400" aria-label="Autopay" />
                        ) : null}
                      </div>
                      {/* Both the recurring rule and the concrete date for the
                          month in view, since they diverge in short months. */}
                      <div className="truncate text-xs text-ink-400">
                        {ordinal(bill.dueDay)} · {format(due, 'EEE, MMM d')}
                        {member ? ` · ${member.emoji}` : ''}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="tabular-nums font-semibold text-ink-700">
                        {formatMoney(bill.amount)}
                      </span>
                      {style.label ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.chip}`}
                        >
                          {style.label}
                        </span>
                      ) : null}
                    </div>

                    <IconButton label={`Edit ${bill.name}`} onClick={() => openEdit(bill)}>
                      <Pencil size={16} />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {bills.length > 0 ? (
          <Card>
            <CardHeader title="By category" />
            <ul className="flex flex-col gap-2.5">
              {BILL_CATEGORIES.map((category) => {
                const amount = bills
                  .filter((bill) => bill.active && bill.category === category)
                  .reduce((sum, bill) => sum + bill.amount, 0);
                if (amount === 0) return null;
                return (
                  <li key={category}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold text-ink-600">{category}</span>
                      <span className="tabular-nums text-ink-500">{formatMoney(amount)}</span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-mist-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${totals.total > 0 ? (amount / totals.total) * 100 : 0}%`,
                          backgroundColor: BILL_CATEGORY_COLOR[category],
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Edit bill' : 'New bill'}
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
            <Button
              full
              onClick={() => void submit()}
              disabled={!draft.name.trim() || !draft.amount.trim()}
            >
              {editingId ? 'Save changes' : 'Add bill'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Bill"
            autoFocus
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Electric"
          />
          <FieldRow>
            <Input
              label="Amount"
              inputMode="decimal"
              value={draft.amount}
              onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
              placeholder="145.00"
            />
            <Input
              label="Due day"
              hint="Day of the month, 1–31"
              inputMode="numeric"
              value={draft.dueDay}
              onChange={(event) => setDraft({ ...draft, dueDay: event.target.value })}
              placeholder="15"
            />
          </FieldRow>
          <Select
            label="Category"
            value={draft.category}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value as BillCategory })
            }
            options={BILL_CATEGORIES.map((category) => ({
              value: category,
              label: `${BILL_CATEGORY_EMOJI[category]}  ${category}`,
            }))}
          />
          <Toggle
            label="Autopay"
            description="Comes out on its own — just worth watching."
            checked={draft.autopay}
            onChange={(autopay) => setDraft({ ...draft, autopay })}
          />
          <Toggle
            label="Active"
            description="Turn off to keep the record without counting it."
            checked={draft.active}
            onChange={(active) => setDraft({ ...draft, active })}
          />
          <Textarea
            label="Notes"
            hint="Optional — account number, payment method…"
            rows={2}
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          />
          <MemberSelect
            members={members}
            value={draft.memberId}
            onChange={(memberId) => setDraft({ ...draft, memberId })}
            emptyLabel="Household"
          />
          {draft.dueDay.trim() !== '' && Number.parseInt(draft.dueDay, 10) > 28 ? (
            <p className="rounded-2xl bg-mist-100 p-3 text-xs text-ink-500">
              Months shorter than the {ordinal(Number.parseInt(draft.dueDay, 10))} will show this on
              their last day, so it never disappears from February.
            </p>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
