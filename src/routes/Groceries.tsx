import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, Circle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/AppShell';
import { Button, IconButton } from '../components/ui/Button';
import { Card, EmptyState } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Sheet } from '../components/ui/Sheet';
import { Input, Select } from '../components/ui/Field';
import { GROCERY_CATEGORIES, GROCERY_CATEGORY_EMOJI } from '../lib/constants';
import type { GroceryCategory, GroceryItem } from '../lib/storage';
import { useCollection } from '../lib/storage/useCollection';

const LONG_PRESS_MS = 550;
const SWIPE_DELETE_PX = 72;

interface RowProps {
  item: GroceryItem;
  onToggle: () => void;
  onDelete: () => void;
}

/**
 * A grocery line. Tap toggles, long-press or swipe-left deletes — both gestures
 * run off pointer events so a mouse press-and-hold works on desktop too.
 */
function GroceryRow({ item, onToggle, onDelete }: RowProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const swiping = useRef(false);
  const cancelled = useRef(false);
  const timer = useRef<number | null>(null);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    startX.current = event.clientX;
    swiping.current = false;
    cancelled.current = false;
    timer.current = window.setTimeout(() => {
      cancelled.current = true;
      onDelete();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const delta = event.clientX - startX.current;
    if (Math.abs(delta) > 6) {
      clearTimer();
      swiping.current = true;
    }
    if (swiping.current) setOffset(Math.min(0, delta));
  };

  const finish = () => {
    clearTimer();
    if (offset <= -SWIPE_DELETE_PX) {
      cancelled.current = true;
      onDelete();
    }
    setOffset(0);
    window.setTimeout(() => {
      swiping.current = false;
    }, 0);
  };

  const onClick = () => {
    if (cancelled.current || swiping.current) return;
    onToggle();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Only painted mid-swipe: a permanently stacked backdrop leaves a
          hairline of red at the clipped corners. */}
      {offset < 0 ? (
        <div className="absolute inset-y-0 right-0 flex items-center bg-red-500 px-4 text-white">
          <Trash2 size={18} />
        </div>
      ) : null}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerLeave={finish}
        onPointerCancel={finish}
        onClick={onClick}
        onContextMenu={(event) => event.preventDefault()}
        style={{ transform: `translateX(${offset}px)` }}
        className="no-select relative flex min-h-[52px] cursor-pointer touch-pan-y items-center gap-3 bg-white px-3 py-2 transition-transform"
      >
        {item.checked ? (
          <CheckCircle2 size={22} className="shrink-0 text-clay-400" />
        ) : (
          <Circle size={22} className="shrink-0 text-sand-300" />
        )}
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate ${
              item.checked ? 'text-ink-400 line-through' : 'font-medium text-ink-700'
            }`}
          >
            {item.name}
          </span>
          {item.quantity ? (
            <span className="block text-xs text-ink-400">{item.quantity}</span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

export default function Groceries() {
  const { items, create, update, remove } = useCollection<GroceryItem>('groceries');
  const [quickName, setQuickName] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [draft, setDraft] = useState<{ name: string; quantity: string; category: GroceryCategory }>({
    name: '',
    quantity: '',
    category: 'Produce',
  });

  const open = useMemo(() => items.filter((item) => !item.checked), [items]);
  const done = useMemo(() => items.filter((item) => item.checked), [items]);

  const grouped = useMemo(() => {
    return GROCERY_CATEGORIES.map((category) => ({
      category,
      items: open.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [open]);

  const addQuick = async () => {
    const name = quickName.trim();
    if (!name) return;
    setQuickName('');
    await create({ name, quantity: '', category: 'Other', checked: false });
  };

  const addDetailed = async () => {
    const name = draft.name.trim();
    if (!name) return;
    await create({
      name,
      quantity: draft.quantity.trim(),
      category: draft.category,
      checked: false,
    });
    setDraft({ name: '', quantity: '', category: draft.category });
    setDetailOpen(false);
  };

  const clearChecked = async () => {
    for (const item of done) await remove(item.id);
  };

  const clearAll = async () => {
    for (const item of items) await remove(item.id);
    setConfirmClearAll(false);
  };

  const toggleSection = (category: string) =>
    setCollapsed((current) =>
      current.includes(category)
        ? current.filter((entry) => entry !== category)
        : [...current, category],
    );

  return (
    <>
      <PageHeader
        title="Groceries"
        subtitle={
          open.length > 0
            ? `${open.length} to get${done.length > 0 ? ` · ${done.length} in the cart` : ''}`
            : 'The list is clear'
        }
        action={
          <Button size="sm" variant="secondary" onClick={() => setDetailOpen(true)}>
            <Plus size={18} />
            Add
          </Button>
        }
      />

      <div className="flex flex-col gap-3 pb-24 md:pb-0">
        {items.length === 0 ? (
          <Card>
            <EmptyState
              emoji="🧺"
              title="Nothing on the list"
              hint="Add what you need and it will group itself by aisle."
              action={
                <Button size="sm" onClick={() => setDetailOpen(true)}>
                  <Plus size={18} />
                  Add an item
                </Button>
              }
            />
          </Card>
        ) : null}

        {grouped.map((group) => {
          const isCollapsed = collapsed.includes(group.category);
          return (
            <Card key={group.category} className="!p-2">
              <button
                type="button"
                onClick={() => toggleSection(group.category)}
                aria-expanded={!isCollapsed}
                className="flex min-h-[44px] w-full items-center gap-2 px-2 text-left"
              >
                <span aria-hidden="true">{GROCERY_CATEGORY_EMOJI[group.category]}</span>
                <span className="text-sm font-bold uppercase tracking-wide text-ink-400">
                  {group.category}
                </span>
                <span className="text-sm text-sand-400">{group.items.length}</span>
                <ChevronDown
                  size={18}
                  className={`ml-auto text-sand-400 transition-transform ${
                    isCollapsed ? '-rotate-90' : ''
                  }`}
                />
              </button>
              {isCollapsed ? null : (
                <ul className="mt-1 flex flex-col gap-1">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <GroceryRow
                        item={item}
                        onToggle={() => update(item.id, { checked: true })}
                        onDelete={() => remove(item.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}

        {done.length > 0 ? (
          <Card className="!p-2">
            <div className="flex min-h-[44px] items-center gap-2 px-2">
              <span aria-hidden="true">✅</span>
              <span className="text-sm font-bold uppercase tracking-wide text-ink-400">Got it</span>
              <span className="text-sm text-sand-400">{done.length}</span>
              <button
                type="button"
                onClick={clearChecked}
                className="ml-auto min-h-[44px] px-2 text-sm font-semibold text-clay-500"
              >
                Clear checked
              </button>
            </div>
            <ul className="mt-1 flex flex-col gap-1">
              {done.map((item) => (
                <li key={item.id}>
                  <GroceryRow
                    item={item}
                    onToggle={() => update(item.id, { checked: false })}
                    onDelete={() => remove(item.id)}
                  />
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {items.length > 0 ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="min-h-[44px] px-2 text-sm font-semibold text-ink-400 hover:text-red-600"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      {/* Quick add: pinned above the tab bar on mobile, inline on desktop. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 px-4 md:static md:mt-4 md:px-0">
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-sand-200 bg-white p-2 shadow-card">
          <input
            value={quickName}
            onChange={(event) => setQuickName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void addQuick();
            }}
            placeholder="Add an item…"
            aria-label="Quick add a grocery item"
            className="min-h-[44px] flex-1 rounded-xl bg-transparent px-2 outline-none placeholder:text-sand-400"
          />
          <IconButton
            label="Add item"
            onClick={() => void addQuick()}
            className="bg-clay-400 text-white hover:bg-clay-500 active:bg-clay-600"
          >
            <Plus size={20} />
          </IconButton>
        </div>
      </div>

      <Sheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Add to the list"
        footer={
          <Button full onClick={() => void addDetailed()} disabled={!draft.name.trim()}>
            Add item
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Item"
            value={draft.name}
            autoFocus
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Sourdough loaf"
          />
          <Input
            label="Quantity"
            hint="Optional — 2 lb, a bunch, 3 cans…"
            value={draft.quantity}
            onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
            placeholder=""
          />
          <Select
            label="Category"
            value={draft.category}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value as GroceryCategory })
            }
            options={GROCERY_CATEGORIES.map((category) => ({
              value: category,
              label: `${GROCERY_CATEGORY_EMOJI[category]}  ${category}`,
            }))}
          />
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmClearAll}
        title="Clear the whole list?"
        message="Every item, checked or not, will be removed. This cannot be undone."
        confirmLabel="Clear all"
        onConfirm={() => void clearAll()}
        onCancel={() => setConfirmClearAll(false)}
      />
    </>
  );
}
