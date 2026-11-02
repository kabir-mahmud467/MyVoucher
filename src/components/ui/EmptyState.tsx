import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 text-center ${
        compact ? 'py-10' : 'py-14 sm:py-20'
      }`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-raised text-muted">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-7 text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
