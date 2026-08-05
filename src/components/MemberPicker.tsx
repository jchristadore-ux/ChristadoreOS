import { EVENT_COLORS } from '../lib/constants';
import type { Member } from '../lib/storage';

interface MemberAvatarProps {
  member: Member;
  size?: 'sm' | 'md';
}

export function MemberAvatar({ member, size = 'sm' }: MemberAvatarProps) {
  const tokens = EVENT_COLORS[member.color];
  const dimensions = size === 'sm' ? 'h-6 w-6 text-[13px]' : 'h-9 w-9 text-lg';
  return (
    <span
      title={member.name}
      className={`inline-flex ${dimensions} items-center justify-center rounded-full ${tokens.soft} border ${tokens.border}`}
    >
      <span aria-hidden="true">{member.emoji}</span>
      <span className="sr-only">{member.name}</span>
    </span>
  );
}

interface MemberStackProps {
  members: Member[];
  ids: string[];
}

export function MemberStack({ members, ids }: MemberStackProps) {
  const assigned = members.filter((member) => ids.includes(member.id));
  if (assigned.length === 0) return null;
  return (
    <span className="flex -space-x-1.5">
      {assigned.map((member) => (
        <MemberAvatar key={member.id} member={member} />
      ))}
    </span>
  );
}

interface MemberPickerProps {
  members: Member[];
  selected: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}

/** Multi-select chips for assigning an event to family members. */
export function MemberPicker({ members, selected, onChange, label = 'Who' }: MemberPickerProps) {
  if (members.length === 0) return null;

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-600">{label}</span>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => {
          const tokens = EVENT_COLORS[member.color];
          const active = selected.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(member.id)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-colors ${
                active
                  ? `${tokens.soft} ${tokens.border} ${tokens.text}`
                  : 'border-sand-200 bg-white text-ink-400'
              }`}
            >
              <span aria-hidden="true">{member.emoji}</span>
              {member.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MemberSelectProps {
  members: Member[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  emptyLabel?: string;
}

/** Single-select variant, used by the expense form. */
export function MemberSelect({
  members,
  value,
  onChange,
  label = 'Who',
  emptyLabel = 'Nobody in particular',
}: MemberSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-600">{label}</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={value === ''}
          onClick={() => onChange('')}
          className={`inline-flex min-h-[44px] items-center rounded-2xl border px-3 text-sm font-semibold transition-colors ${
            value === ''
              ? 'border-sand-300 bg-sand-100 text-ink-600'
              : 'border-sand-200 bg-white text-ink-400'
          }`}
        >
          {emptyLabel}
        </button>
        {members.map((member) => {
          const tokens = EVENT_COLORS[member.color];
          const active = value === member.id;
          return (
            <button
              key={member.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(member.id)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-colors ${
                active
                  ? `${tokens.soft} ${tokens.border} ${tokens.text}`
                  : 'border-sand-200 bg-white text-ink-400'
              }`}
            >
              <span aria-hidden="true">{member.emoji}</span>
              {member.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
