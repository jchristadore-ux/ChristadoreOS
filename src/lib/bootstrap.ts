import {
  clearAllLocalData,
  storage,
  DEFAULT_SETTINGS,
  SETTINGS_ID,
  type AppSettings,
  type Member,
} from './storage';
import { createId } from './storage/useCollection';

/**
 * The smallest amount of state a usable app needs: one family member to assign
 * things to, and the default settings record. No sample events, groceries, or
 * expenses — every screen starts empty and says so.
 */
async function bootstrap(): Promise<void> {
  const now = Date.now();

  const me: Member = {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    name: 'Me',
    color: 'clay',
    emoji: '🙂',
  };
  await storage.put<Member>('members', me);

  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    seeded: true,
    createdAt: now,
    updatedAt: now,
  };
  await storage.put<AppSettings>('settings', settings);
}

/** Runs once, the very first time the app opens on this device. */
export async function ensureBootstrapped(): Promise<void> {
  const existing = await storage.get<AppSettings>('settings', SETTINGS_ID);
  if (existing?.seeded) return;
  await bootstrap();
}

/**
 * Settings → "Clear all data": erases every collection on this device and
 * starts over from the same blank slate a fresh install gets.
 */
export async function clearAllData(): Promise<void> {
  clearAllLocalData();
  await bootstrap();
}
