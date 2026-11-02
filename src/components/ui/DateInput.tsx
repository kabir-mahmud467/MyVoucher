import { CalendarDays, X } from 'lucide-react';
import { formatVoucherDate } from '../../lib/dates';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  id?: string;
  className?: string;
  variant?: 'field' | 'spreadsheet';
  clearable?: boolean;
  disabled?: boolean;
  ariaInvalid?: boolean;
  onBlur?: () => void;
}

/**
 * Native date picker with a Bengali-first visible date label.
 * The native control stays interactive for accessibility and keyboard use.
 */
export function DateInput({
  value,
  onChange,
  ariaLabel,
  id,
  className = '',
  variant = 'field',
  clearable = false,
  disabled = false,
  ariaInvalid = false,
  onBlur,
}: DateInputProps) {
  const base =
    variant === 'spreadsheet'
      ? 'date-field date-field-spreadsheet'
      : 'date-field date-field-boxed';

  return (
    <div
      className={`${base} ${className}`}
      data-empty={!value}
      aria-invalid={ariaInvalid || undefined}
    >
      <CalendarDays
        size={variant === 'spreadsheet' ? 13 : 15}
        className="shrink-0 text-muted"
        aria-hidden="true"
      />
      <span className="date-field-label">{value ? formatVoucherDate(value) : 'তারিখ'}</span>
      {clearable && value && !disabled && (
        <button
          type="button"
          className="date-field-clear"
          aria-label="তারিখ ফিল্টার মুছুন"
          onClick={() => onChange('')}
        >
          <X size={12} />
        </button>
      )}
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
        className="date-field-native"
      />
    </div>
  );
}
