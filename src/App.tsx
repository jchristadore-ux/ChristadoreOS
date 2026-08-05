import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import CalendarRoute from './routes/Calendar';
import Countdowns from './routes/Countdowns';
import Groceries from './routes/Groceries';
import More from './routes/More';
import Reminders from './routes/Reminders';
import Settings from './routes/Settings';
import Spending from './routes/Spending';
import Today from './routes/Today';
import { startReminderScheduler } from './lib/notifications';
import { ensureBootstrapped } from './lib/bootstrap';
import { useGoogleSync } from './lib/useGoogleSync';

/** Mounted once so the 15-minute cache refresh runs on app open. */
function GoogleSyncOnOpen() {
  useGoogleSync();
  return null;
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensureBootstrapped().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    return startReminderScheduler();
  }, [ready]);

  if (!ready) {
    // First paint before seeding finishes: a skeleton, never a spinner.
    return (
      <div className="min-h-screen bg-sand-50 p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 pt-6">
          <div className="h-8 w-40 animate-pulse rounded-2xl bg-sand-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-sand-100" />
          <div className="h-32 animate-pulse rounded-2xl bg-sand-100" />
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <GoogleSyncOnOpen />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Today />} />
          <Route path="calendar" element={<CalendarRoute />} />
          <Route path="groceries" element={<Groceries />} />
          <Route path="spending" element={<Spending />} />
          <Route path="more" element={<More />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="countdowns" element={<Countdowns />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
