import { Check } from 'lucide-react';
import { EVENT_COLORS, EVENT_COLOR_KEYS } from '../lib/constants';
import type { EventColor } from '../lib/storage';

interface ColorPickerProps {
  value: EventColor;
  onChange: (color: EventColor) => void;
  label?: string;
}

/** The fixed six-color palette shared by events, countdowns, and members. */
export function ColorPicker({ value, onChange, label = 'Color' }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-600">{label}</span>
      <div className="flex flex-wrap gap-2">
        {EVENT_COLOR_KEYS.map((key) => {
          const tokens = EVENT_COLORS[key];
          const active = key === value;
          return (
            <button
              key={key}
              type="button"
              aria-label={tokens.label}
              aria-pressed={active}
              onClick={() => onChange(key)}
              className="flex h-11 w-11 items-center justify-center rounded-full"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${tokens.dot} ${
                  active ? 'ring-2 ring-ink-600 ring-offset-2 ring-offset-mist-50' : ''
                }`}
              >
                {active ? <Check size={16} className="text-white" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
