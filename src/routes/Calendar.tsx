import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Timer,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/AppShell';
import { Button, IconButton } from '../components/ui/Button';
import { Card, EmptyState } from '../components/ui/Card';
import { Segmented } from '../components/ui/Segmented';
import { Sheet } from '../components/ui/Sheet';
import { FieldRow, Input, Textarea, Toggle } from '../components/ui/Field';
import { ColorPicker } from '../components/ColorPicker';
import { MemberPicker, MemberStack } from '../components/MemberPicker';
import { EVENT_COLORS } from '../lib/constants';
import { combineDateTime, formatTime, friendlyDateKey, fromDateKey, toDateKey } from '../lib/format';
import type { Countdown, EventColor, FamilyEvent, Member } from '../lib/storage';
import { useCollection } from '../lib/storage/useCollection';

type View = 'month' | 'agenda';

interface Draft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  notes: string;
  color: EventColor;
  memberIds: string[];
}

const emptyDraft = (date: string): Draft => ({
  title: '',
  date,
  startTime: '09:00',
  endTime: '10:00',
  allDay: false,
  location: '',
  notes: '',
  color: 'clay',
  memberIds: [],
});

/** All-day first, then by start time. */
function compareEvents(a: FamilyEvent, b: FamilyEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
}

export function eventTimeLabel(event: FamilyEvent): string {
  if (event.allDay) return 'All day';
  const start = formatTime(event.startTime);
  const end = formatTime(event.endTime);
  return end ? `${start} – ${end}` : start;
}

interface EventRowProps {
  event: FamilyEvent;
  members: Member[];
  onOpen: () => void;
}

export function EventRow({ event, members, onOpen }: EventRowProps) {
  const tokens = EVENT_COLORS[event.color];
  const isGoogle = event.source === 'google';
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
        isGoogle
          ? 'border-dashed border-mist-300 bg-mist-100/70'
          : `${tokens.border} ${tokens.soft}`
      }`}
    >
      <span className={`h-8 w-1.5 shrink-0 rounded-full ${isGoogle ? 'bg-mist-400' : tokens.dot}`} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-ink-700">{event.title}</span>
          {isGoogle ? (
            <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">
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
    </button>
  );
}

export default function CalendarRoute() {
  const { items: events, create, update, remove } = useCollection<FamilyEvent>('events');
  const { items: members } = useCollection<Member>('members');
  const { create: createCountdown } = useCollection<Countdown>('countdowns');

  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(toDateKey(new Date())));
  const [quickTitle, setQuickTitle] = useState('');
  const [promoted, setPromoted] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, FamilyEvent[]>();
    for (const event of events) {
      const bucket = map.get(event.date);
      if (bucket) bucket.push(event);
      else map.set(event.date, [event]);
    }
    for (const bucket of map.values()) bucket.sort(compareEvents);
    return map;
  }, [events]);

  const monthDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }),
      }),
    [cursor],
  );

  const agenda = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const keys = [...byDate.keys()].filter((key) => key >= todayKey).sort();
    return keys.map((key) => ({ key, events: byDate.get(key) ?? [] }));
  }, [byDate]);

  const openEvent = openEventId ? events.find((event) => event.id === openEventId) : undefined;
  const dayEvents = selectedDay ? (byDate.get(selectedDay) ?? []) : [];

  const openNew = (date: string) => {
    setEditingId(null);
    setDraft(emptyDraft(date));
    setFormOpen(true);
  };

  const openEdit = (event: FamilyEvent) => {
    setEditingId(event.id);
    setDraft({
      title: event.title,
      date: event.date,
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '10:00',
      allDay: event.allDay,
      location: event.location,
      notes: event.notes,
      color: event.color,
      memberIds: event.memberIds,
    });
    setOpenEventId(null);
    setFormOpen(true);
  };

  const submit = async () => {
    const title = draft.title.trim();
    if (!title) return;
    const payload = {
      title,
      date: draft.date,
      startTime: draft.allDay ? '' : draft.startTime,
      endTime: draft.allDay ? '' : draft.endTime,
      allDay: draft.allDay,
      location: draft.location.trim(),
      notes: draft.notes.trim(),
      color: draft.color,
      memberIds: draft.memberIds,
      source: 'manual' as const,
    };
    if (editingId) await update(editingId, payload);
    else await create(payload);
    setFormOpen(false);
  };

  const quickAdd = async () => {
    const title = quickTitle.trim();
    if (!title || !selectedDay) return;
    setQuickTitle('');
    await create({
      title,
      date: selectedDay,
      startTime: '',
      endTime: '',
      allDay: true,
      location: '',
      notes: '',
      color: 'clay',
      memberIds: [],
      source: 'manual',
    });
  };

  const promoteToCountdown = async (event: FamilyEvent) => {
    const target = event.allDay
      ? combineDateTime(event.date, '09:00')
      : combineDateTime(event.date, event.startTime || '09:00');
    await createCountdown({
      title: event.title,
      target: target.toISOString(),
      emoji: '🎉',
      color: event.source === 'google' ? 'sky' : event.color,
    });
    setPromoted(event.id);
  };

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={format(cursor, 'MMMM yyyy')}
        action={
          <Button size="sm" onClick={() => openNew(toDateKey(new Date()))}>
            <Plus size={18} />
            Event
          </Button>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Segmented
          value={view}
          label="Calendar view"
          onChange={setView}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'agenda', label: 'Agenda' },
          ]}
        />
        {view === 'month' ? (
          <div className="ml-auto flex items-center gap-1">
            <IconButton label="Previous month" onClick={() => setCursor(subMonths(cursor, 1))}>
              <ChevronLeft size={20} />
            </IconButton>
            <button
              type="button"
              onClick={() => setCursor(startOfMonth(new Date()))}
              className="min-h-[44px] rounded-2xl px-3 text-sm font-semibold text-ink-500"
            >
              Today
            </button>
            <IconButton label="Next month" onClick={() => setCursor(addMonths(cursor, 1))}>
              <ChevronRight size={20} />
            </IconButton>
          </div>
        ) : null}
      </div>

      {view === 'month' ? (
        <Card className="!p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wide text-ink-400">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
              <span key={`${label}-${index}`} className="py-1">
                {label}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const key = toDateKey(day);
              const dayList = byDate.get(key) ?? [];
              const outside = !isSameMonth(day, cursor);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  className={`flex min-h-[56px] flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors ${
                    isToday(day) ? 'bg-iris-50 ring-1 ring-iris-200' : 'hover:bg-mist-100'
                  } ${outside ? 'opacity-40' : ''}`}
                >
                  <span
                    className={`text-sm ${
                      isToday(day) ? 'font-bold text-iris-500' : 'font-medium text-ink-600'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  <span className="flex flex-wrap justify-center gap-0.5">
                    {dayList.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          event.source === 'google'
                            ? 'bg-mist-400 ring-1 ring-mist-300'
                            : EVENT_COLORS[event.color].dot
                        }`}
                      />
                    ))}
                    {dayList.length > 3 ? (
                      <span className="text-[9px] font-bold leading-none text-ink-400">
                        +{dayList.length - 3}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {agenda.length === 0 ? (
            <Card>
              <EmptyState
                emoji="🗓️"
                title="Nothing scheduled ahead"
                hint="Add an event, or connect Google Calendar in Settings."
                action={
                  <Button size="sm" onClick={() => openNew(toDateKey(new Date()))}>
                    <Plus size={18} />
                    Add an event
                  </Button>
                }
              />
            </Card>
          ) : (
            agenda.map((group) => (
              <Card key={group.key} className="!p-3">
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">
                    {friendlyDateKey(group.key)}
                  </h2>
                  <span className="text-xs text-mist-400">
                    {format(fromDateKey(group.key), 'MMM d')}
                  </span>
                  <IconButton
                    label={`Add an event on ${friendlyDateKey(group.key)}`}
                    className="ml-auto -mr-1"
                    onClick={() => openNew(group.key)}
                  >
                    <Plus size={18} />
                  </IconButton>
                </div>
                <ul className="flex flex-col gap-2">
                  {group.events.map((event) => (
                    <li key={event.id}>
                      <EventRow
                        event={event}
                        members={members}
                        onOpen={() => setOpenEventId(event.id)}
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            ))
          )}
        </div>
      )}

      {/* A single day's events, with a quick-add pinned to the footer. */}
      <Sheet
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? friendlyDateKey(selectedDay) : ''}
        footer={
          <div className="flex items-center gap-2">
            <input
              value={quickTitle}
              onChange={(event) => setQuickTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void quickAdd();
              }}
              placeholder="Quick add…"
              aria-label="Quick add an event"
              className="min-h-[48px] flex-1 rounded-2xl border border-mist-200 bg-white px-3.5 outline-none placeholder:text-mist-400 focus:border-iris-300 focus:ring-2 focus:ring-iris-200"
            />
            <Button onClick={() => void quickAdd()} disabled={!quickTitle.trim()}>
              Add
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          {dayEvents.length === 0 ? (
            <EmptyState emoji="🌤️" title="Nothing planned" hint="A rare open day." />
          ) : (
            dayEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                members={members}
                onOpen={() => setOpenEventId(event.id)}
              />
            ))
          )}
          {selectedDay ? (
            <Button
              variant="secondary"
              full
              className="mt-2"
              onClick={() => {
                openNew(selectedDay);
                setSelectedDay(null);
              }}
            >
              <CalendarPlus size={18} />
              Add with details
            </Button>
          ) : null}
        </div>
      </Sheet>

      {/* Event detail. Google events are read-only by design. */}
      <Sheet
        open={openEvent !== undefined}
        onClose={() => {
          setOpenEventId(null);
          setPromoted(null);
        }}
        title={openEvent?.title ?? ''}
        footer={
          openEvent ? (
            <div className="flex gap-3">
              {openEvent.source === 'manual' ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await remove(openEvent.id);
                      setOpenEventId(null);
                    }}
                  >
                    <Trash2 size={18} />
                    Delete
                  </Button>
                  <Button full onClick={() => openEdit(openEvent)}>
                    <Pencil size={18} />
                    Edit
                  </Button>
                </>
              ) : (
                <Button variant="secondary" full onClick={() => setOpenEventId(null)}>
                  Close
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {openEvent ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-sm text-ink-600">
              <p className="flex items-center gap-2">
                <Clock size={16} className="text-ink-400" />
                {friendlyDateKey(openEvent.date)} · {eventTimeLabel(openEvent)}
              </p>
              {openEvent.location ? (
                <p className="flex items-center gap-2">
                  <MapPin size={16} className="text-ink-400" />
                  {openEvent.location}
                </p>
              ) : null}
              {openEvent.source === 'google' ? (
                <p className="rounded-2xl bg-mist-100 p-3 text-xs text-ink-500">
                  From Google Calendar
                  {openEvent.calendarName ? ` · ${openEvent.calendarName}` : ''}. Read-only here —
                  edit it in Google Calendar.
                </p>
              ) : null}
            </div>

            {openEvent.notes ? (
              <p className="whitespace-pre-wrap rounded-2xl bg-white p-3 text-sm text-ink-600 shadow-card">
                {openEvent.notes}
              </p>
            ) : null}

            {openEvent.memberIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink-600">Who</span>
                <MemberStack members={members} ids={openEvent.memberIds} />
              </div>
            ) : null}

            <Button
              variant="secondary"
              full
              onClick={() => void promoteToCountdown(openEvent)}
              disabled={promoted === openEvent.id}
            >
              <Timer size={18} />
              {promoted === openEvent.id ? 'Added to countdowns' : 'Make a countdown'}
            </Button>
          </div>
        ) : null}
      </Sheet>

      {/* Create / edit form. */}
      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit event' : 'New event'}
        footer={
          <Button full onClick={() => void submit()} disabled={!draft.title.trim()}>
            {editingId ? 'Save changes' : 'Add event'}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            autoFocus
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="Soccer practice"
          />
          <Input
            label="Date"
            type="date"
            value={draft.date}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
          />
          <Toggle
            label="All day"
            checked={draft.allDay}
            onChange={(allDay) => setDraft({ ...draft, allDay })}
          />
          {draft.allDay ? null : (
            <FieldRow>
              <Input
                label="Starts"
                type="time"
                value={draft.startTime}
                onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
              />
              <Input
                label="Ends"
                type="time"
                value={draft.endTime}
                onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
              />
            </FieldRow>
          )}
          <Input
            label="Location"
            hint="Optional"
            value={draft.location}
            onChange={(event) => setDraft({ ...draft, location: event.target.value })}
            placeholder="Riverside Field 3"
          />
          <Textarea
            label="Notes"
            hint="Optional"
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          />
          <ColorPicker value={draft.color} onChange={(color) => setDraft({ ...draft, color })} />
          <MemberPicker
            members={members}
            selected={draft.memberIds}
            onChange={(memberIds) => setDraft({ ...draft, memberIds })}
          />
        </div>
      </Sheet>
    </>
  );
}
