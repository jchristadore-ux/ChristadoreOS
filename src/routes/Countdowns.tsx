import { useEffect, useMemo, useState } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, format, isPast } from 'date-fns';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/AppShell';
import { Button, IconButton } from '../components/ui/Button';
import { Card, EmptyState } from '../components/ui/Card';
import { Sheet } from '../components/ui/Sheet';
import { FieldRow, Input } from '../components/ui/Field';
import { ColorPicker } from '../components/ColorPicker';
import { EVENT_COLORS } from '../lib/constants';
import { parseIso } from '../lib/format';
import type { Countdown, EventColor } from '../lib/storage';
import { useCollection } from '../lib/storage/useCollection';

const COUNTDOWN_EMOJI = ['🎉', '🎂', '🏖️', '🎄', '✈️', '🎓', '🥂', '⚽️', '🎁', '🏕️'];

/** Re-renders every consumer once a minute so the numbers stay honest. */
export function useMinuteTick(): number {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return tick;
}

export function countdownParts(target: Date, from: Date) {
  const days = Math.max(0, differenceInDays(target, from));
  const hours = Math.max(0, differenceInHours(target, from) - days * 24);
  const minutes = Math.max(0, differenceInMinutes(target, from) - days * 24 * 60 - hours * 60);
  return { days, hours, minutes };
}

interface Draft {
  title: string;
  date: string;
  time: string;
  emoji: string;
  color: EventColor;
}

const emptyDraft = (): Draft => ({
  title: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  time: '09:00',
  emoji: '🎉',
  color: 'clay',
});

interface CardProps {
  countdown: Countdown;
  now: Date;
  onEdit: () => void;
}

function CountdownCard({ countdown, now, onEdit }: CardProps) {
  const target = parseIso(countdown.target);
  const passed = isPast(target);
  const { days, hours, minutes } = countdownParts(target, now);
  const tokens = EVENT_COLORS[countdown.color];

  return (
    <div className={`relative rounded-2xl border ${tokens.border} ${tokens.soft} p-4 shadow-card`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl" aria-hidden="true">
          {countdown.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-ink-700">{countdown.title}</h3>
          <p className={`text-sm ${tokens.text}`}>{format(target, "EEE, MMM d 'at' h:mm a")}</p>
        </div>
        <IconButton label={`Edit ${countdown.title}`} onClick={onEdit} className="-mr-2 -mt-2">
          <Pencil size={16} />
        </IconButton>
      </div>

      {passed ? (
        <p className="mt-3 text-sm font-semibold text-ink-400">
          {Math.abs(differenceInDays(now, target))} days ago
        </p>
      ) : (
        <div className="mt-3 flex gap-4">
          {[
            { value: days, label: days === 1 ? 'day' : 'days' },
            { value: hours, label: hours === 1 ? 'hour' : 'hours' },
            { value: minutes, label: minutes === 1 ? 'min' : 'mins' },
          ].map((part) => (
            <div key={part.label}>
              <p className="text-2xl font-bold tabular-nums text-ink-700">{part.value}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                {part.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Countdowns() {
  const { items, create, update, remove } = useCollection<Countdown>('countdowns');
  const tick = useMinuteTick();
  const now = useMemo(() => new Date(tick), [tick]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const { upcoming, passed } = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => parseIso(a.target).getTime() - parseIso(b.target).getTime(),
    );
    return {
      upcoming: sorted.filter((item) => parseIso(item.target).getTime() > now.getTime()),
      passed: sorted
        .filter((item) => parseIso(item.target).getTime() <= now.getTime())
        .reverse(),
    };
  }, [items, now]);

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setSheetOpen(true);
  };

  const openEdit = (countdown: Countdown) => {
    const target = parseIso(countdown.target);
    setEditingId(countdown.id);
    setDraft({
      title: countdown.title,
      date: format(target, 'yyyy-MM-dd'),
      time: format(target, 'HH:mm'),
      emoji: countdown.emoji,
      color: countdown.color,
    });
    setSheetOpen(true);
  };

  const submit = async () => {
    const title = draft.title.trim();
    if (!title) return;
    const target = new Date(`${draft.date}T${draft.time || '00:00'}`);
    if (Number.isNaN(target.getTime())) return;
    const payload = {
      title,
      target: target.toISOString(),
      emoji: draft.emoji,
      color: draft.color,
    };
    if (editingId) {
      await update(editingId, payload);
    } else {
      await create(payload);
    }
    setSheetOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Countdowns"
        subtitle="The things everyone keeps asking about"
        action={
          <Button size="sm" onClick={openNew}>
            <Plus size={18} />
            New
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <Card>
            <EmptyState
              emoji="⏳"
              title="Nothing to look forward to yet"
              hint="Add a trip, a birthday, or the last day of school."
              action={
                <Button size="sm" onClick={openNew}>
                  <Plus size={18} />
                  Add a countdown
                </Button>
              }
            />
          </Card>
        ) : null}

        {upcoming.map((countdown) => (
          <CountdownCard
            key={countdown.id}
            countdown={countdown}
            now={now}
            onEdit={() => openEdit(countdown)}
          />
        ))}

        {passed.length > 0 ? (
          <>
            <h2 className="mt-3 px-1 text-sm font-bold uppercase tracking-wide text-ink-400">
              Passed
            </h2>
            <div className="flex flex-col gap-3 opacity-70">
              {passed.map((countdown) => (
                <CountdownCard
                  key={countdown.id}
                  countdown={countdown}
                  now={now}
                  onEdit={() => openEdit(countdown)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Edit countdown' : 'New countdown'}
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
              {editingId ? 'Save changes' : 'Add countdown'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="What are we waiting for?"
            autoFocus
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="Beach trip"
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
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink-600">Emoji</span>
            <div className="flex flex-wrap gap-2">
              {COUNTDOWN_EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={emoji}
                  aria-pressed={draft.emoji === emoji}
                  onClick={() => setDraft({ ...draft, emoji })}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-xl ${
                    draft.emoji === emoji
                      ? 'border-clay-300 bg-clay-50'
                      : 'border-sand-200 bg-white'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <ColorPicker
            value={draft.color}
            onChange={(color) => setDraft({ ...draft, color })}
            label="Background"
          />
        </div>
      </Sheet>
    </>
  );
}
