interface SegmentedProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}

export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-2xl bg-mist-100 p-1 text-sm font-semibold"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-[40px] rounded-xl px-3.5 transition-colors ${
              active ? 'bg-white text-ink-700 shadow-sm' : 'text-ink-400 hover:text-ink-600'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
