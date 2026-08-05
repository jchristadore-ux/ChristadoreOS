import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const CONTROL =
  'w-full min-h-[48px] rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 text-ink-700 placeholder:text-sand-400 focus:border-clay-300 focus:outline-none focus:ring-2 focus:ring-clay-200';

interface LabelledProps {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}

function Labelled({ label, hint, children }: LabelledProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink-600">
        {label}
      </label>
      {children(id)}
      {hint ? <p className="text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
}

export function Input({ label, hint, className = '', ...rest }: InputProps) {
  return (
    <Labelled label={label} hint={hint}>
      {(id) => <input id={id} className={`${CONTROL} ${className}`} {...rest} />}
    </Labelled>
  );
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'children'> {
  label: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, hint, options, className = '', ...rest }: SelectProps) {
  return (
    <Labelled label={label} hint={hint}>
      {(id) => (
        <select id={id} className={`${CONTROL} appearance-none pr-8 ${className}`} {...rest}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Labelled>
  );
}

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  hint?: string;
}

export function Textarea({ label, hint, className = '', rows = 3, ...rest }: TextareaProps) {
  return (
    <Labelled label={label} hint={hint}>
      {(id) => <textarea id={id} rows={rows} className={`${CONTROL} ${className}`} {...rest} />}
    </Labelled>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-sand-200 bg-white px-3.5 py-2.5 text-left"
    >
      <span className="flex-1">
        <span className="block text-sm font-semibold text-ink-600">{label}</span>
        {description ? <span className="block text-xs text-ink-400">{description}</span> : null}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-clay-400' : 'bg-sand-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[1.375rem]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

interface FieldRowProps {
  children: ReactNode;
}

/** Two controls side by side on every screen size. */
export function FieldRow({ children }: FieldRowProps) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
