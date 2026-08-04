import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PageHeader, SECONDARY_NAV } from '../components/AppShell';
import { Card } from '../components/ui/Card';

const DESCRIPTIONS: Record<string, string> = {
  '/reminders': 'Nudges and alarms while the app is open',
  '/countdowns': 'Days until the things everyone is waiting for',
  '/settings': 'Family members, budget, Google Calendar',
};

export default function More() {
  return (
    <>
      <PageHeader title="More" subtitle="The rest of FamilyOS" />
      <Card className="!p-2">
        <ul className="flex flex-col divide-y divide-sand-100">
          {SECONDARY_NAV.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex min-h-[56px] items-center gap-3 rounded-2xl px-2 transition-colors hover:bg-sand-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-clay-50 text-clay-500">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink-700">{item.label}</span>
                  <span className="block truncate text-xs text-ink-400">
                    {DESCRIPTIONS[item.to] ?? ''}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-sand-400" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
