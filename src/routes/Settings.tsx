import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, HardDrive, Landmark, Plus, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { PageHeader } from '../components/AppShell';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Sheet } from '../components/ui/Sheet';
import { Input } from '../components/ui/Field';
import { ColorPicker } from '../components/ColorPicker';
import { MEMBER_EMOJI } from '../lib/constants';
import {
  clearGoogleEvents,
  connectGoogle,
  disconnectGoogle,
  isGoogleConfigured,
  listGoogleCalendars,
  type GoogleCalendarSummary,
} from '../lib/google';
import { claimSetupToken, disconnectBank, getBankConfig, setBankConfig } from '../lib/bank';
import { useBankBalances } from '../lib/useBankBalances';
import { formatMoney } from '../lib/format';
import { clearAllData } from '../lib/bootstrap';
import { DEFAULT_SETTINGS, storage, type EventColor, type Member } from '../lib/storage';
import { useCollection } from '../lib/storage/useCollection';
import { useAppSettings, useGoogleCacheMeta } from '../lib/useSettings';
import { useGoogleSync } from '../lib/useGoogleSync';

interface MemberDraft {
  name: string;
  color: EventColor;
  emoji: string;
}

const emptyMember = (): MemberDraft => ({ name: '', color: 'clay', emoji: '🙂' });

export default function Settings() {
  const { items: members, create, update, remove } = useCollection<Member>('members');
  const { settings, save } = useAppSettings();
  const { save: saveMeta } = useGoogleCacheMeta();
  const sync = useGoogleSync();
  const bank = useBankBalances();

  const [bankForm, setBankForm] = useState(() => getBankConfig());
  const [setupToken, setSetupToken] = useState('');
  const [bankBusy, setBankBusy] = useState(false);
  const [bankError, setBankError] = useState('');
  const [bankNote, setBankNote] = useState('');

  const [budgetInput, setBudgetInput] = useState(String(settings.dailyBudget));
  const [memberSheet, setMemberSheet] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft>(emptyMember);
  const [confirmReset, setConfirmReset] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendarSummary[]>([]);
  const [googleError, setGoogleError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const configured = isGoogleConfigured();

  const loadCalendars = useCallback(async () => {
    try {
      setCalendars(await listGoogleCalendars());
      setGoogleError('');
    } catch (caught) {
      setCalendars([]);
      setGoogleError(caught instanceof Error ? caught.message : 'Could not load your calendars');
    }
  }, []);

  useEffect(() => {
    if (sync.connected) void loadCalendars();
  }, [sync.connected, loadCalendars]);

  const connect = async () => {
    setConnecting(true);
    setGoogleError('');
    try {
      await connectGoogle();
      await loadCalendars();
    } catch (caught) {
      setGoogleError(caught instanceof Error ? caught.message : 'Could not connect to Google');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    disconnectGoogle();
    await clearGoogleEvents();
    await save({ googleCalendarIds: [] });
    await saveMeta({ lastSyncedAt: 0, connectedEmail: '' });
    setCalendars([]);
  };

  const toggleCalendar = async (id: string) => {
    const next = settings.googleCalendarIds.includes(id)
      ? settings.googleCalendarIds.filter((entry) => entry !== id)
      : [...settings.googleCalendarIds, id];
    await save({ googleCalendarIds: next });
  };

  const commitBudget = async () => {
    const parsed = Number.parseFloat(budgetInput);
    const value = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
    setBudgetInput(String(value));
    await save({ dailyBudget: value });
  };

  const openNewMember = () => {
    setEditingMember(null);
    setMemberDraft(emptyMember());
    setMemberSheet(true);
  };

  const openEditMember = (member: Member) => {
    setEditingMember(member.id);
    setMemberDraft({ name: member.name, color: member.color, emoji: member.emoji });
    setMemberSheet(true);
  };

  const submitMember = async () => {
    const name = memberDraft.name.trim();
    if (!name) return;
    if (editingMember) await update(editingMember, { ...memberDraft, name });
    else await create({ ...memberDraft, name });
    setMemberSheet(false);
  };

  const saveBankConfig = () => {
    setBankConfig(bankForm);
    setBankForm(getBankConfig());
    setBankNote('Saved on this device.');
    setBankError('');
  };

  const connectBank = async () => {
    setBankBusy(true);
    setBankError('');
    setBankNote('');
    try {
      setBankConfig(bankForm);
      await claimSetupToken(setupToken);
      setSetupToken('');
      await bank.refresh();
      setBankNote('Connected.');
    } catch (caught) {
      setBankError(caught instanceof Error ? caught.message : 'Could not connect.');
    } finally {
      setBankBusy(false);
    }
  };

  const disconnectTheBank = async () => {
    setBankBusy(true);
    setBankError('');
    try {
      await disconnectBank();
      await bank.refresh();
      setBankNote('Disconnected.');
    } catch (caught) {
      setBankError(caught instanceof Error ? caught.message : 'Could not disconnect.');
    } finally {
      setBankBusy(false);
    }
  };

  const reset = async () => {
    await clearAllData();
    setConfirmReset(false);
    setBudgetInput(String(DEFAULT_SETTINGS.dailyBudget));
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Family, budget, and connections" />

      <div className="flex flex-col gap-3">
        <Card>
          <CardHeader title="Storage" icon={<HardDrive size={18} />} />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mist-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-ink-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {storage.mode === 'local' ? 'Local mode' : 'Cloud mode'}
            </span>
            <p className="text-xs text-ink-400">Everything stays on this device.</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Family" />
          <ul className="mb-3 flex flex-col divide-y divide-mist-100">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-2">
                <span className="text-xl" aria-hidden="true">
                  {member.emoji}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink-700">
                  {member.name}
                </span>
                <IconButton label={`Edit ${member.name}`} onClick={() => openEditMember(member)}>
                  <Pencil size={16} />
                </IconButton>
                <IconButton
                  label={`Remove ${member.name}`}
                  onClick={() => remove(member.id)}
                  className="hover:text-red-600"
                >
                  <Trash2 size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" onClick={openNewMember}>
            <Plus size={18} />
            Add a family member
          </Button>
        </Card>

        <Card>
          <CardHeader title="Daily budget" />
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Amount in USD"
                inputMode="decimal"
                value={budgetInput}
                onChange={(event) => setBudgetInput(event.target.value)}
                onBlur={() => void commitBudget()}
              />
            </div>
            <Button variant="secondary" onClick={() => void commitBudget()}>
              Save
            </Button>
          </div>
          <p className="mt-2 text-xs text-ink-400">
            The Today card turns amber at 80% and red once you pass it. Set 0 to hide the budget.
          </p>
        </Card>

        <Card>
          <CardHeader title="Google Calendar" />
          {!configured ? (
            <div className="rounded-2xl bg-mist-100 p-3">
              <p className="text-sm font-semibold text-ink-600">Not configured</p>
              <p className="mt-1 text-xs text-ink-500">
                Set <code className="rounded bg-white px-1">VITE_GOOGLE_CLIENT_ID</code> to turn this
                on. Everything else in ChristadoreOS works without it.
              </p>
            </div>
          ) : !sync.connected ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink-500">
                Read your Google calendars into ChristadoreOS. Events stay read-only here.
              </p>
              <Button onClick={() => void connect()} disabled={connecting}>
                {connecting ? 'Opening Google…' : 'Connect Google Calendar'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  <Check size={12} />
                  Connected
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void sync.refresh()}
                  disabled={sync.status === 'syncing'}
                  className="ml-auto"
                >
                  <RefreshCw size={16} className={sync.status === 'syncing' ? 'animate-spin' : ''} />
                  Refresh
                </Button>
              </div>

              <p className="text-xs text-ink-400">
                {sync.lastSyncedAt > 0
                  ? `Last synced ${formatDistanceToNow(sync.lastSyncedAt, { addSuffix: true })} · next 60 days`
                  : 'Not synced yet — pick a calendar below.'}
              </p>

              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-ink-600">Calendars to include</span>
                {calendars.length === 0 ? (
                  <p className="text-xs text-ink-400">No calendars found on this account.</p>
                ) : (
                  <ul className="flex flex-col">
                    {calendars.map((calendar) => {
                      const checked = settings.googleCalendarIds.includes(calendar.id);
                      return (
                        <li key={calendar.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => void toggleCalendar(calendar.id)}
                            className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-1 text-left hover:bg-mist-50"
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                checked
                                  ? 'border-iris-400 bg-iris-400 text-white'
                                  : 'border-mist-300 bg-white'
                              }`}
                            >
                              {checked ? <Check size={14} /> : null}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm text-ink-600">
                              {calendar.name}
                              {calendar.primary ? ' · primary' : ''}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <Button variant="secondary" size="sm" onClick={() => void disconnect()}>
                Disconnect
              </Button>
            </div>
          )}

          {googleError || sync.error ? (
            <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
              {googleError || sync.error}
            </p>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Bank balance" icon={<Landmark size={18} />} />
          <p className="mb-3 text-xs text-ink-400">
            Balances come from SimpleFIN through your own Cloudflare worker. The worker holds the
            credential; this app only ever receives the numbers. Both fields below stay on this
            device and are never built into the app.
          </p>

          <div className="flex flex-col gap-3">
            <Input
              label="Worker URL"
              hint="https://christadoreos-bank.<your-subdomain>.workers.dev"
              value={bankForm.workerUrl}
              onChange={(event) => setBankForm({ ...bankForm, workerUrl: event.target.value })}
              placeholder="https://christadoreos-bank.example.workers.dev"
            />
            <Input
              label="Household key"
              type="password"
              hint="Must match the HOUSEHOLD_KEY secret on the worker"
              value={bankForm.householdKey}
              onChange={(event) => setBankForm({ ...bankForm, householdKey: event.target.value })}
            />
            <Button variant="secondary" size="sm" onClick={saveBankConfig}>
              Save connection
            </Button>
          </div>

          {bank.connected ? (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  <Check size={12} />
                  Connected
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  disabled={bank.loading}
                  onClick={() => void bank.refresh()}
                >
                  <RefreshCw size={16} className={bank.loading ? 'animate-spin' : ''} />
                  Refresh
                </Button>
              </div>
              <ul className="flex flex-col divide-y divide-mist-100">
                {bank.accounts.map((account) => (
                  <li key={account.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-700">
                        {account.name}
                      </span>
                      {account.org ? (
                        <span className="block truncate text-xs text-ink-400">{account.org}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold text-ink-700">
                      {formatMoney(account.balance)}
                    </span>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="sm" onClick={() => void disconnectTheBank()} disabled={bankBusy}>
                Disconnect bank
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <Input
                label="SimpleFIN setup token"
                hint="One-time token from beta-bridge.simplefin.org — it can only be claimed once"
                value={setupToken}
                onChange={(event) => setSetupToken(event.target.value)}
              />
              <Button
                size="sm"
                onClick={() => void connectBank()}
                disabled={bankBusy || !setupToken.trim() || !bankForm.workerUrl.trim()}
              >
                {bankBusy ? 'Connecting…' : 'Connect bank'}
              </Button>
            </div>
          )}

          {bankError || bank.error ? (
            <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
              {bankError || bank.error}
            </p>
          ) : bankNote ? (
            <p className="mt-2 text-xs text-emerald-700">{bankNote}</p>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Notifications" />
          <p className="text-sm text-ink-500">
            Browser notifications only fire reliably while the app is open or installed as a PWA, and
            iOS requires the app be added to the Home Screen.
          </p>
        </Card>

        <Card>
          <CardHeader title="Clear all data" />
          <p className="mb-3 text-sm text-ink-500">
            Erase everything stored on this device — events, groceries, expenses, reminders,
            countdowns, and family members — and start from an empty app. This only affects this
            device, and it cannot be undone.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)}>
            Clear all data
          </Button>
        </Card>
      </div>

      <Sheet
        open={memberSheet}
        onClose={() => setMemberSheet(false)}
        title={editingMember ? 'Edit family member' : 'Add family member'}
        footer={
          <Button full onClick={() => void submitMember()} disabled={!memberDraft.name.trim()}>
            {editingMember ? 'Save changes' : 'Add member'}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            autoFocus
            value={memberDraft.name}
            onChange={(event) => setMemberDraft({ ...memberDraft, name: event.target.value })}
            placeholder="Sam"
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink-600">Avatar</span>
            <div className="flex flex-wrap gap-2">
              {MEMBER_EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={emoji}
                  aria-pressed={memberDraft.emoji === emoji}
                  onClick={() => setMemberDraft({ ...memberDraft, emoji })}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-xl ${
                    memberDraft.emoji === emoji
                      ? 'border-iris-300 bg-iris-50'
                      : 'border-mist-200 bg-white'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <ColorPicker
            value={memberDraft.color}
            onChange={(color) => setMemberDraft({ ...memberDraft, color })}
          />
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmReset}
        title="Clear all data?"
        message="Everything saved on this device will be erased and the app will start empty, with just a single family member named Me. This cannot be undone."
        confirmLabel="Clear everything"
        onConfirm={() => void reset()}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}
