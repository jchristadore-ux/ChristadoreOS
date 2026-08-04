import { useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import { AlarmClock, Bell, BellOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/AppShell';
import { Button, IconButton } from '../components/ui/Button';
import { Card, EmptyState } from '../components/ui/Card';
import { Sheet } from '../components/ui/Sheet';
import { FieldRow, Input, Select, Toggle } from '../components/ui/Field';
import { REPEAT_LABELS } from '../lib/constants';
import { formatTime, friendlyDate, toDateKey } from '../lib/format';
import {
  nextOccurrence,
  notificationPermission,
  requestNotificationPermission,
} from '../lib/notifications';
import type { Reminder, RepeatRule } from '../lib/storage';
import { useCollection } from '../lib/storage/useCollection';

interface Draft {
  title: string;
  date: string;
  time: string;
  repeat: RepeatRule;
  isAlarm: boolean;
}

const emptyDraft = (): Draft => ({
  title: '',
  date: toDateKey(new Date()),
  time: '09:00',
  repeat: 'none',
  isAlarm: false,
});

const REPEAT_OPTIONS = (Object.keys(REPEAT_LABELS) as RepeatRule[]).map((value) => ({
  value,
  label: REPEAT_LABELS[value],
}));

export default function Reminders() {
  const { items, create, update, remove } = useCollection<Reminder>('reminders');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [permission, setPermission] = useState(() => notificationPermission());

  const now = useMemo(() => new Date(), []);

  const sorted = useMemo(() => {
    const withNext = items.map((reminder) => ({
      reminder,
      next: nextOccurrence(reminder, new Date(Math.max(reminder.lastFiredAt, now.getTime()))),
    }));
    return withNext.sort((a, b) => {
      if (!a.next && !b.next) return a.reminder.title.localeCompare(b.reminder.title);
      if (!a.next) return 1;
      if (!b.next) return -1;
      return a.next.getTime() - b.next.getTime();
    });
  }, [items, now]);

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSheetOpen(true);
  };

  const openEdit = (reminder: Reminder) => {
    setEditingId(reminder.id);
    setDraft({
      title: reminder.title,
      date: reminder.date,
      time: reminder.time,
      repeat: reminder.repeat,
      isAlarm: reminder.isAlarm,
    });
    setSheetOpen(true);
  };

  const submit = async () => {
    const title = draft.title.trim();
    if (!title) return;

    if (!editingId) {
      // The first reminder is the moment permission is actually meaningful.
      const result = await requestNotificationPermission();
      if (result !== 'unsupported') setPermission(result);
    }

    const payload = {
      title,
      date: draft.date,
      time: draft.time,
      repeat: draft.repeat,
      isAlarm: draft.isAlarm,
    };

    if (editingId) {
      await update(editingId, payload);
    } else {
      await create({ ...payload, enabled: true, lastFiredAt: 0 });
    }
    setSheetOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Reminders"
        subtitle="Nudges while FamilyOS is open"
        action={
          <Button size="sm" onClick={openNew}>
            <Plus size={18} />
            New
          </Button>
        }
      />

      {permission === 'denied' ? (
        <Card className="mb-3 !bg-amber-50">
          <p className="text-sm text-amber-900">
            Notifications are blocked for this site, so reminders will only appear in this list.
            Re-enable them in your browser's site settings.
          </p>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <Card>
            <EmptyState
              emoji="🔔"
              title="No reminders yet"
              hint="Trash night, vitamins, the water bill — the small stuff that slips."
              action={
                <Button size="sm" onClick={openNew}>
                  <Plus size={18} />
                  Add a reminder
                </Button>
              }
            />
          </Card>
        ) : null}

        {sorted.map(({ reminder, next }) => (
          <Card key={reminder.id} className="!py-3">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  reminder.enabled ? 'bg-clay-50 text-clay-500' : 'bg-sand-100 text-sand-400'
                }`}
              >
                {reminder.isAlarm ? <AlarmClock size={20} /> : <Bell size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate font-semibold ${
                    reminder.enabled ? 'text-ink-700' : 'text-ink-400 line-through'
                  }`}
                >
                  {reminder.title}
                </p>
                <p className="text-xs text-ink-400">
                  {next
                    ? `${isToday(next) ? 'Today' : friendlyDate(next)} at ${format(next, 'h:mm a')}`
                    : `${friendlyDate(new Date(`${reminder.date}T00:00`))} at ${formatTime(reminder.time)} · done`}
                  {reminder.repeat === 'none' ? '' : ` · ${REPEAT_LABELS[reminder.repeat]}`}
                </p>
              </div>
              <IconButton
                label={reminder.enabled ? `Turn off ${reminder.title}` : `Turn on ${reminder.title}`}
                onClick={() => update(reminder.id, { enabled: !reminder.enabled })}
              >
                {reminder.enabled ? <Bell size={18} /> : <BellOff size={18} />}
              </IconButton>
              <IconButton label={`Edit ${reminder.title}`} onClick={() => openEdit(reminder)}>
                <Pencil size={16} />
              </IconButton>
            </div>
          </Card>
        ))}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Edit reminder' : 'New reminder'}
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
            <Button full onClick={() => void submit()} disabled={!draft.title.trim()}>
              {editingId ? 'Save changes' : 'Add reminder'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Remind me to"
            autoFocus
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="Take out the trash"
          />
          <FieldRow>
            <Input
              label="Date"
              type="date"
              value={draft.date}
              onChange={(event) => setDraft({ ...draft, date: event.target.value })}
            />
            <Input
              label="Time"
              type="time"
              value={draft.time}
              onChange={(event) => setDraft({ ...draft, time: event.target.value })}
            />
          </FieldRow>
          <Select
            label="Repeat"
            value={draft.repeat}
            onChange={(event) => setDraft({ ...draft, repeat: event.target.value as RepeatRule })}
            options={REPEAT_OPTIONS}
          />
          <Toggle
            label="Play an alarm tone"
            description="Adds a short sound when this one fires."
            checked={draft.isAlarm}
            onChange={(isAlarm) => setDraft({ ...draft, isAlarm })}
          />
          <p className="rounded-2xl bg-sand-100 p-3 text-xs text-ink-500">
            Browser notifications only fire reliably while FamilyOS is open or installed as a PWA.
            On iOS, add it to your Home Screen first.
          </p>
        </div>
      </Sheet>
    </>
  );
}
