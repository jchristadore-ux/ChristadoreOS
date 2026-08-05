import { useMemo } from 'react';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import {
  AlarmClock,
  Bell,
  CalendarDays,
  Landmark,
  Receipt,
  ShoppingCart,
  Timer,
  Wallet,
} from 'lucide-react';
import { CardHeader, EmptyLine, LinkCard } from '../components/ui/Card';
import { MemberStack } from '../components/MemberPicker';
import { countdownParts, useMinuteTick } from './Countdowns';
import { eventTimeLabel } from './Calendar';
import { BILL_CATEGORY_EMOJI, EVENT_COLORS } from '../lib/constants';
import { formatMoney, formatMoneyShort, greeting, parseIso, toDateKey } from '../lib/format';
import { occurrencesDueToday, occurrencesOverdue } from '../lib/bills';
import { useBankBalances } from '../lib/useBankBalances';
import { nextOccurrence } from '../lib/notifications';
import type {
  Bill,
  Countdown,
  Expense,
  FamilyEvent,
  GroceryItem,
  Member,
  Reminder,
} from '../lib/storage';
import { useCollection } from '../lib/storage/useCollection';
import { useAppSettings } from '../lib/useSettings';

export default function Today() {
  const tick = useMinuteTick();
  const now = useMemo(() => new Date(tick), [tick]);
  const todayKey = toDateKey(now);

  const { items: events } = useCollection<FamilyEvent>('events');
  const { items: members } = useCollection<Member>('members');
  const { items: countdowns } = useCollection<Countdown>('countdowns');
  const { items: groceries } = useCollection<GroceryItem>('groceries');
  const { items: expenses } = useCollection<Expense>('expenses');
  const { items: reminders } = useCollection<Reminder>('reminders');
  const { items: bills } = useCollection<Bill>('bills');
  const { settings } = useAppSettings();
  const bank = useBankBalances();

  const todayEvents = useMemo(
    () =>
      events
        .filter((event) => event.date === todayKey)
        .sort((a, b) => {
          if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
          return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
        }),
    [events, todayKey],
  );

  const upcomingCountdowns = useMemo(
    () =>
      countdowns
        .filter((countdown) => parseIso(countdown.target).getTime() > now.getTime())
        .sort((a, b) => parseIso(a.target).getTime() - parseIso(b.target).getTime())
        .slice(0, 3),
    [countdowns, now],
  );

  const unchecked = useMemo(() => groceries.filter((item) => !item.checked), [groceries]);

  const todaySpend = useMemo(
    () =>
      expenses
        .filter((expense) => expense.date === todayKey)
        .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses, todayKey],
  );

  const dueToday = useMemo(() => occurrencesDueToday(bills, now), [bills, now]);
  const overdue = useMemo(() => occurrencesOverdue(bills, now), [bills, now]);
  const dueTodayTotal = useMemo(
    () => dueToday.reduce((sum, row) => sum + row.bill.amount, 0),
    [dueToday],
  );

  const budgetPct = settings.dailyBudget > 0 ? (todaySpend / settings.dailyBudget) * 100 : 0;
  const budgetTone =
    budgetPct > 100
      ? { text: 'text-red-600', bar: 'bg-red-500' }
      : budgetPct >= 80
        ? { text: 'text-amber-600', bar: 'bg-amber-500' }
        : { text: 'text-ink-700', bar: 'bg-iris-400' };

  const todayReminders = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.enabled)
        .map((reminder) => ({
          reminder,
          next: nextOccurrence(reminder, new Date(Math.max(reminder.lastFiredAt, now.getTime()))),
        }))
        .filter((entry) => entry.next !== null && isSameDay(entry.next, now))
        .sort((a, b) => (a.next?.getTime() ?? 0) - (b.next?.getTime() ?? 0)),
    [reminders, now],
  );

  return (
    <div className="flex flex-col gap-3">
      <header className="px-1 pb-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink-700">{greeting(now)}</h1>
        <p className="text-sm text-ink-400">{format(now, 'EEEE, MMMM d')}</p>
      </header>

      {bank.configured ? (
        <LinkCard to="/settings">
          <CardHeader title="Balance" icon={<Landmark size={18} />} chevron />
          {bank.connected && bank.accounts.length > 0 ? (
            <>
              <p className="text-3xl font-bold tracking-tight text-ink-700">
                {formatMoney(bank.total)}
              </p>
              <p className="mt-1.5 truncate text-xs text-ink-400">
                {bank.accounts.length === 1
                  ? bank.accounts[0]?.name
                  : `across ${bank.accounts.length} accounts`}
                {bank.fetchedAt > 0 ? ` · ${formatDistanceToNow(bank.fetchedAt)} ago` : ''}
                {bank.loading ? ' · refreshing…' : ''}
              </p>
            </>
          ) : (
            <EmptyLine>
              {bank.error || 'Not connected to a bank yet. Finish setup in Settings.'}
            </EmptyLine>
          )}
        </LinkCard>
      ) : null}

      <LinkCard to="/calendar">
        <CardHeader title="Today" icon={<CalendarDays size={18} />} chevron />
        {todayEvents.length === 0 ? (
          <EmptyLine>Nothing on the calendar today. Enjoy the quiet.</EmptyLine>
        ) : (
          <ul className="flex flex-col gap-2">
            {todayEvents.map((event) => (
              <li key={event.id} className="flex items-center gap-2.5">
                <span
                  className={`h-8 w-1.5 shrink-0 rounded-full ${
                    event.source === 'google' ? 'bg-mist-400' : EVENT_COLORS[event.color].dot
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-ink-700">{event.title}</span>
                    {event.source === 'google' ? (
                      <span className="shrink-0 rounded-full bg-mist-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">
                        Google
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-ink-400">
                    {eventTimeLabel(event)}
                    {event.location ? ` · ${event.location}` : ''}
                  </span>
                </span>
                <MemberStack members={members} ids={event.memberIds} />
              </li>
            ))}
          </ul>
        )}
      </LinkCard>

      <div className="grid gap-3 md:grid-cols-2">
        <LinkCard to="/spending">
          <CardHeader title="Spent today" icon={<Wallet size={18} />} chevron />
          <p className={`text-3xl font-bold tracking-tight ${budgetTone.text}`}>
            {formatMoney(todaySpend)}
          </p>
          {settings.dailyBudget > 0 ? (
            <>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist-200">
                <div
                  className={`h-full rounded-full transition-all ${budgetTone.bar}`}
                  style={{ width: `${Math.min(100, budgetPct)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-400">
                {budgetPct > 100
                  ? `${formatMoneyShort(todaySpend - settings.dailyBudget)} over the ${formatMoneyShort(settings.dailyBudget)} daily budget`
                  : `of a ${formatMoneyShort(settings.dailyBudget)} daily budget`}
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-xs text-ink-400">No daily budget set.</p>
          )}
        </LinkCard>

        <LinkCard to="/groceries">
          <CardHeader title="Groceries" icon={<ShoppingCart size={18} />} chevron />
          {unchecked.length === 0 ? (
            <EmptyLine>The list is clear.</EmptyLine>
          ) : (
            <>
              <p className="text-3xl font-bold tracking-tight text-ink-700">{unchecked.length}</p>
              <p className="mt-1.5 truncate text-xs text-ink-400">
                {unchecked
                  .slice(0, 4)
                  .map((item) => item.name)
                  .join(', ')}
                {unchecked.length > 4 ? '…' : ''}
              </p>
            </>
          )}
        </LinkCard>
      </div>

      <LinkCard to="/countdowns">
        <CardHeader title="Coming up" icon={<Timer size={18} />} chevron />
        {upcomingCountdowns.length === 0 ? (
          <EmptyLine>No countdowns yet. Add the next trip or birthday.</EmptyLine>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcomingCountdowns.map((countdown) => {
              const { days, hours } = countdownParts(parseIso(countdown.target), now);
              const tokens = EVENT_COLORS[countdown.color];
              return (
                <li key={countdown.id} className="flex items-center gap-2.5">
                  <span className="text-xl" aria-hidden="true">
                    {countdown.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink-700">
                      {countdown.title}
                    </span>
                    <span className="block text-xs text-ink-400">
                      {format(parseIso(countdown.target), 'EEE, MMM d')}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm font-bold ${tokens.text}`}>
                    {days > 0 ? `${days}d` : `${hours}h`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </LinkCard>

      <LinkCard to="/bills">
        <CardHeader title="Bills" icon={<Receipt size={18} />} chevron />
        {dueToday.length === 0 && overdue.length === 0 ? (
          <EmptyLine>Nothing due today.</EmptyLine>
        ) : (
          <>
            {dueToday.length > 0 ? (
              <p className="text-3xl font-bold tracking-tight text-ink-700">
                {formatMoney(dueTodayTotal)}
              </p>
            ) : null}
            <ul className="mt-1.5 flex flex-col gap-2">
              {dueToday.map((row) => (
                <li key={row.key + row.bill.id} className="flex items-center gap-2.5">
                  <span aria-hidden="true">{BILL_CATEGORY_EMOJI[row.bill.category]}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink-700">
                    {row.bill.name}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-ink-500">
                    {formatMoney(row.bill.amount)}
                  </span>
                </li>
              ))}
              {overdue.map((row) => (
                <li key={row.key + row.bill.id} className="flex items-center gap-2.5">
                  <span aria-hidden="true">{BILL_CATEGORY_EMOJI[row.bill.category]}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink-700">
                    {row.bill.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                    Overdue
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </LinkCard>

      <LinkCard to="/reminders">
        <CardHeader title="Reminders today" icon={<Bell size={18} />} chevron />
        {todayReminders.length === 0 ? (
          <EmptyLine>Nothing set for today.</EmptyLine>
        ) : (
          <ul className="flex flex-col gap-2">
            {todayReminders.map(({ reminder, next }) => (
              <li key={reminder.id} className="flex items-center gap-2.5">
                <span className="text-iris-400">
                  {reminder.isAlarm ? <AlarmClock size={18} /> : <Bell size={18} />}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink-700">
                  {reminder.title}
                </span>
                <span className="shrink-0 text-sm font-semibold text-ink-500">
                  {next ? format(next, 'h:mm a') : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </LinkCard>
    </div>
  );
}
