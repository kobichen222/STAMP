'use client';

import { Icon } from '@/components/ui/Icon';

export function Section({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-4 last:border-0">
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-ink-2">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  onStart,
  onEnd,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-[13px] text-ink-2">
        {label}
        <span className="flex items-center gap-1">
          <input
            type="number"
            value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-16 rounded-md border border-line bg-white px-1.5 py-0.5 text-left text-[13px] tabular-nums outline-none focus:border-blue"
            aria-label={label}
          />
          {unit && <span className="text-xs text-muted">{unit}</span>}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onStart}
        onPointerUp={onEnd}
        onKeyUp={onEnd}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue"
        aria-label={label}
      />
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label?: string; icon?: string; title?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.title ?? o.label}
          title={o.title ?? o.label}
          onClick={() => onChange(o.value)}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[13px] transition ${value === o.value ? 'bg-white text-ink shadow-soft' : 'text-muted hover:text-ink'}`}
        >
          {o.icon && <Icon name={o.icon} size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function IconToggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg border transition ${on ? 'border-blue bg-blue-50 text-blue' : 'border-line bg-white text-ink-2 hover:border-ink/30'}`}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}

export function IconButton({ icon, label, onClick, disabled, className = '', size = 18 }: { icon: string; label: string; onClick?: () => void; disabled?: boolean; className?: string; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-9 w-9 place-items-center rounded-lg text-ink-2 transition hover:bg-surface hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent ${className}`}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] text-ink-2">{label}</span>
      {children}
    </label>
  );
}
