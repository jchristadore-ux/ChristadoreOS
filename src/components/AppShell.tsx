import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  Receipt,
  Home,
  LayoutGrid,
  Settings as SettingsIcon,
  ShoppingCart,
  Timer,
  Wallet,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

/** The five bottom tabs on mobile. */
const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Today', icon: <Home size={22} /> },
  { to: '/calendar', label: 'Calendar', icon: <CalendarDays size={22} /> },
  { to: '/groceries', label: 'Groceries', icon: <ShoppingCart size={22} /> },
  { to: '/spending', label: 'Spending', icon: <Wallet size={22} /> },
  { to: '/more', label: 'More', icon: <LayoutGrid size={22} /> },
];

/** Everything behind "More" — promoted to the sidebar on desktop. */
export const SECONDARY_NAV: NavItem[] = [
  { to: '/bills', label: 'Bills', icon: <Receipt size={22} /> },
  { to: '/reminders', label: 'Reminders', icon: <Bell size={22} /> },
  { to: '/countdowns', label: 'Countdowns', icon: <Timer size={22} /> },
  { to: '/settings', label: 'Settings', icon: <SettingsIcon size={22} /> },
];

const SIDEBAR_NAV = [...PRIMARY_NAV.filter((item) => item.to !== '/more'), ...SECONDARY_NAV];

export function AppShell() {
  return (
    <div className="min-h-screen bg-mist-50 md:flex">
      {/* Sidebar: md and up */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-mist-200 bg-mist-100/60 px-3 py-6 md:flex">
        <div className="mb-6 flex items-center gap-2 px-3">
          <img
            src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
            alt=""
            className="h-8 w-8 rounded-lg"
          />
          {/* Wordmark picks up the same cyan-to-violet ramp as the icon. */}
          <span className="bg-beam-gradient bg-clip-text text-lg font-bold tracking-tight text-transparent">
            ChristadoreOS
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {SIDEBAR_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-[44px] items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-white text-iris-500 shadow-card'
                    : 'text-ink-500 hover:bg-white/70 hover:text-ink-700'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="safe-top mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar: mobile only */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-mist-200 bg-mist-50/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-lg">
          {PRIMARY_NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    isActive ? 'text-iris-500' : 'text-ink-400'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="mb-4 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink-700">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-400">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
