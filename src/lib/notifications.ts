import { addDays, addMonths, addWeeks, isWeekend } from 'date-fns';
import { storage, type Reminder } from './storage';
import { combineDateTime } from './format';
import { playAlarmTone } from './audio';

/** Longest single setTimeout we will hold. Anything further out is picked up on
 *  the next app open or visibility change. */
const MAX_LOOKAHEAD_MS = 6 * 60 * 60 * 1000;

/** A reminder whose moment passed while the tab was hidden still fires if it
 *  was recent enough to matter. */
const CATCH_UP_MS = 5 * 60 * 1000;

const timers = new Map<string, number>();
let latest: Reminder[] = [];
let started = false;

/** The next time this reminder should fire strictly after `after`, or null. */
export function nextOccurrence(reminder: Reminder, after: Date): Date | null {
  const base = combineDateTime(reminder.date, reminder.time || '00:00');
  if (Number.isNaN(base.getTime())) return null;

  if (reminder.repeat === 'none') {
    return base.getTime() > after.getTime() ? base : null;
  }

  let candidate = base;
  // 800 steps covers well over a year of daily repeats.
  for (let step = 0; step < 800; step += 1) {
    if (candidate.getTime() > after.getTime()) {
      if (reminder.repeat !== 'weekdays' || !isWeekend(candidate)) return candidate;
    }
    if (reminder.repeat === 'daily' || reminder.repeat === 'weekdays') {
      candidate = addDays(candidate, 1);
    } else if (reminder.repeat === 'weekly') {
      candidate = addWeeks(candidate, 1);
    } else {
      candidate = addMonths(candidate, 1);
    }
  }
  return null;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Asked only when the user creates their first reminder — never on load. */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

async function show(reminder: Reminder): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const options: NotificationOptions = {
    body: reminder.isAlarm ? 'Alarm from ChristadoreOS' : 'Reminder from ChristadoreOS',
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    tag: reminder.id,
  };
  try {
    new Notification(reminder.title, options);
  } catch {
    // Chrome on Android refuses the Notification constructor when a service
    // worker is in play and requires the registration to show it instead.
    try {
      const registration = await navigator.serviceWorker?.ready;
      await registration?.showNotification(reminder.title, options);
    } catch {
      // Notifications are unavailable in this context; the in-app list is still
      // accurate, which is all we promise.
    }
  }
}

async function fire(reminder: Reminder, occurrence: Date): Promise<void> {
  await show(reminder);
  if (reminder.isAlarm) playAlarmTone();
  const current = await storage.get<Reminder>('reminders', reminder.id);
  if (!current) return;
  await storage.put<Reminder>('reminders', {
    ...current,
    lastFiredAt: occurrence.getTime(),
    updatedAt: Date.now(),
  });
}

function clearTimers(): void {
  for (const id of timers.values()) window.clearTimeout(id);
  timers.clear();
}

function reschedule(reminders: Reminder[]): void {
  latest = reminders;
  clearTimers();
  const now = new Date();

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;

    const after = new Date(Math.max(reminder.lastFiredAt, now.getTime() - CATCH_UP_MS));
    const occurrence = nextOccurrence(reminder, after);
    if (!occurrence) continue;

    const delay = occurrence.getTime() - now.getTime();
    if (delay <= 0) {
      void fire(reminder, occurrence);
      continue;
    }
    if (delay > MAX_LOOKAHEAD_MS) continue;

    timers.set(
      reminder.id,
      window.setTimeout(() => {
        void fire(reminder, occurrence);
      }, delay),
    );
  }
}

/**
 * Starts the only scheduler in the app. Timers are rebuilt whenever reminders
 * change and whenever the tab becomes visible again, because background tabs
 * get their timers throttled or frozen.
 */
export function startReminderScheduler(): () => void {
  if (started) return () => undefined;
  started = true;

  const unsubscribe = storage.subscribe<Reminder>('reminders', reschedule);

  const onVisibility = () => {
    if (document.visibilityState === 'visible') reschedule(latest);
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    unsubscribe();
    document.removeEventListener('visibilitychange', onVisibility);
    clearTimers();
    started = false;
  };
}
