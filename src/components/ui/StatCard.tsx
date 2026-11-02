import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: string;
  meta?: string;
  icon: LucideIcon;
  tone?: 'primary' | 'accent' | 'neutral';
}) {
  const toneClasses =
    tone === 'accent'
      ? 'bg-accent-soft text-accent'
      : tone === 'neutral'
        ? 'bg-raised text-muted'
        : 'bg-primary-soft text-primary';

  return (
    <div className="card group relative overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-muted">{label}</p>
          <p className="money mt-2 truncate font-display text-2xl font-bold leading-tight text-ink sm:text-[27px]">
            {value}
          </p>
          {meta && <p className="mt-1.5 truncate text-[11.5px] text-muted">{meta}</p>}
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}
        >
          <Icon size={19} strokeWidth={1.8} />
        </span>
      </div>
      <span className="pointer-events-none absolute -bottom-5 -right-2 font-display text-7xl font-bold text-ink/[0.025]">
        ৳
      </span>
    </div>
  );
}
