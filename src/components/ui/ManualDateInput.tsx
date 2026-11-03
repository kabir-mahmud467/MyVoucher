import { useEffect, useMemo, useState } from 'react';
import { toBengaliDigits, toEnglishDigits } from '../../lib/format';
import {
  BENGALI_MONTHS,
  clampDay,
  daysInMonth,
  parseISODate,
  toISODate,
} from '../../lib/dates';

interface ManualDateInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
}

/**
 * Voucher-friendly date entry: month and year are pre-selected, while the day
 * is typed manually. Keeps a valid ISO value at all times.
 */
export function ManualDateInput({
  value,
  onChange,
  ariaLabel = 'খরচের তারিখ',
  id,
  disabled = false,
  ariaInvalid = false,
}: ManualDateInputProps) {
  const parsed = parseISODate(value) ?? new Date();
  const year = parsed.getFullYear();
  const month = parsed.getMonth() + 1;
  const day = parsed.getDate();

  const [dayText, setDayText] = useState(String(day));

  useEffect(() => {
    setDayText(String(day));
  }, [day, month, year]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list: number[] = [];
    for (let candidate = current - 5; candidate <= current + 2; candidate += 1) {
      list.push(candidate);
    }
    if (!list.includes(year)) list.push(year);
    return list.sort((a, b) => b - a);
  }, [year]);

  const commit = (nextDay: number, nextMonth: number, nextYear: number) => {
    const safeDay = clampDay(nextYear, nextMonth, nextDay);
    const next = new Date(nextYear, nextMonth - 1, safeDay);
    const iso = toISODate(next);
    if (iso !== value) onChange(iso);
  };

  const changeDay = (rawValue: string) => {
    const digits = toEnglishDigits(rawValue).replace(/[^\d]/g, '').slice(0, 2);
    setDayText(digits);
    const nextDay = Number(digits);
    if (
      Number.isInteger(nextDay) &&
      nextDay >= 1 &&
      nextDay <= daysInMonth(year, month)
    ) {
      commit(nextDay, month, year);
    }
  };

  const blurDay = () => {
    const nextDay = Number(dayText) || day;
    const safeDay = clampDay(year, month, nextDay);
    setDayText(String(safeDay));
    commit(safeDay, month, year);
  };

  const changeMonth = (nextMonth: number) => {
    const safeDay = clampDay(year, nextMonth, Number(dayText) || day);
    setDayText(String(safeDay));
    commit(safeDay, nextMonth, year);
  };

  const changeYear = (nextYear: number) => {
    const safeDay = clampDay(nextYear, month, Number(dayText) || day);
    setDayText(String(safeDay));
    commit(safeDay, month, nextYear);
  };

  return (
    <div
      className="manual-date-field"
      data-empty={!value}
      aria-invalid={ariaInvalid || undefined}
    >
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className="field manual-date-day"
        value={dayText}
        onChange={(event) => changeDay(event.target.value)}
        onBlur={blurDay}
        aria-label={`${ariaLabel} — দিন`}
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
        maxLength={2}
        placeholder="দিন"
      />
      <select
        className="field manual-date-select"
        value={month}
        onChange={(event) => changeMonth(Number(event.target.value))}
        aria-label={`${ariaLabel} — মাস`}
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
      >
        {BENGALI_MONTHS.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        className="field manual-date-select"
        value={year}
        onChange={(event) => changeYear(Number(event.target.value))}
        aria-label={`${ariaLabel} — বছর`}
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
      >
        {years.map((option) => (
          <option key={option} value={option}>
            {toBengaliDigits(option)}
          </option>
        ))}
      </select>
    </div>
  );
}
