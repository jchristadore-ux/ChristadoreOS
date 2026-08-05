import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-card ${className}`}>{children}</section>
  );
}

interface LinkCardProps extends CardProps {
  to: string;
}

/** A whole card that navigates. Used all over the Today dashboard. */
export function LinkCard({ to, children, className = '' }: LinkCardProps) {
  return (
    <Link
      to={to}
      className={`block rounded-2xl bg-white p-4 shadow-card transition-transform active:scale-[0.99] ${className}`}
    >
      {children}
    </Link>
  );
}

interface CardHeaderProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  /** Renders a chevron to signal the whole card is tappable. */
  chevron?: boolean;
}

export function CardHeader({ title, icon, action, chevron = false }: CardHeaderProps) {
  return (
    <header className="mb-3 flex items-center gap-2">
      {icon ? <span className="text-clay-400">{icon}</span> : null}
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">{title}</h2>
      <div className="ml-auto flex items-center gap-1">
        {action}
        {chevron ? <ChevronRight size={18} className="text-sand-400" /> : null}
      </div>
    </header>
  );
}

interface EmptyStateProps {
  emoji: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ emoji, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className="text-3xl" aria-hidden="true">
        {emoji}
      </span>
      <p className="font-semibold text-ink-600">{title}</p>
      {hint ? <p className="max-w-xs text-sm text-ink-400">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Inline, quieter empty state for inside a dashboard card. */
export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-ink-400">{children}</p>;
}
