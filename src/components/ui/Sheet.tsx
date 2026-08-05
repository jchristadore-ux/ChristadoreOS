import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Sticky action row pinned to the bottom of the sheet. */
  footer?: ReactNode;
}

/**
 * Bottom sheet on mobile, centered modal from `md:` up. One component, because
 * the only difference is where it is anchored.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-ink-700/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-mist-50 shadow-sheet',
          'animate-sheet-up md:max-h-[86vh] md:max-w-lg md:animate-pop-in md:rounded-3xl',
        ].join(' ')}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-mist-200 px-4 py-3">
          <h2 className="text-lg font-bold text-ink-700">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="ml-auto -mr-2">
            <X size={20} />
          </IconButton>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer ? (
          <footer className="safe-bottom shrink-0 border-t border-mist-200 bg-mist-50 px-4 py-3">
            {footer}
          </footer>
        ) : (
          <div className="safe-bottom" />
        )}
      </div>
    </div>
  );
}
