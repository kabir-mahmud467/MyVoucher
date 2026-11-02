import { Link } from 'react-router-dom';

export function LogoMark({ size = 38, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="512" height="512" rx="112" fill="#0D4639" />
      <path
        d="M78 380c78 52 188 69 356-2"
        stroke="#2A7E68"
        strokeWidth="2"
        opacity=".55"
      />
      <path
        d="M90 408c86 49 196 58 332-8"
        stroke="#2A7E68"
        strokeWidth="2"
        opacity=".3"
      />
      <path
        d="M164 112h184a20 20 0 0 1 20 20v212l-24 16-24-16-24 16-24-16-24 16-24-16-24 16V132a20 20 0 0 1 20-20Z"
        fill="#FFFDF6"
      />
      <path d="M192 160h128" stroke="#17493D" strokeWidth="14" strokeLinecap="round" />
      <path d="M192 198h88" stroke="#B9B09D" strokeWidth="10" strokeLinecap="round" />
      <path d="M192 232h112" stroke="#B9B09D" strokeWidth="10" strokeLinecap="round" />
      <circle cx="300" cy="310" r="52" fill="#B96F36" />
      <path
        d="M278 310l15 16 30-34"
        stroke="#FFF9ED"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Brand({
  compact = false,
  className = '',
  to = '/',
}: {
  compact?: boolean;
  className?: string;
  to?: string;
}) {
  return (
    <Link to={to} className={`inline-flex items-center gap-3 ${className}`} aria-label="MyVoucher হোম">
      <LogoMark size={compact ? 34 : 40} className="shrink-0 rounded-[26%] shadow-sm" />
      <span className="min-w-0">
        <span className="block font-display text-lg font-bold leading-none tracking-tight">
          MyVoucher
        </span>
        {!compact && (
          <span className="mt-1 block text-[10.5px] leading-none tracking-[0.08em] opacity-70">
            খরচ ও ভাউচার ব্যবস্থাপনা
          </span>
        )}
      </span>
    </Link>
  );
}
