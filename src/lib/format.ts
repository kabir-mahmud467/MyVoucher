const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const ENGLISH_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function toBengaliDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)]);
}

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[০-৯]/g, (digit) => String(BENGALI_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => ENGLISH_DIGITS[Number(digit)]);
}

/** Parses both Bengali and western digits, commas, currency symbols and spaces. */
export function parseNumericInput(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (value == null) return NaN;
  const cleaned = toEnglishDigits(String(value))
    .replace(/[৳,\s_]/g, '')
    .replace(/[^\d.+-]/g, '');
  if (!cleaned || cleaned === '.' || cleaned === '-' || cleaned === '+') return NaN;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

const numberFormatter = new Intl.NumberFormat('bn-BD', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('bn-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '৳ —';
  return `৳ ${numberFormatter.format(value)}`;
}

export function formatTaka(value: number): string {
  if (!Number.isFinite(value)) return '— টাকা';
  return `${numberFormatter.format(value)} টাকা`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${toBengaliDigits(value.toFixed(value >= 10 ? 0 : 1).replace(/\.0$/, ''))}%`;
}

export function truncate(value: string, length = 70): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trimEnd()}…`;
}
