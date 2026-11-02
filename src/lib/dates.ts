import { toBengaliDigits } from './format';

const BENGALI_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const BENGALI_WEEKDAYS = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
];

/** Local calendar date as YYYY-MM-DD, avoiding UTC date shifts. */
export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isValidISODate(value: string): boolean {
  return parseISODate(value) !== null;
}

export function formatVoucherDate(value: string): string {
  const date = parseISODate(value);
  if (!date) return '—';
  return toBengaliDigits(
    `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`,
  );
}

export function formatDateBn(value: string): string {
  const date = parseISODate(value);
  if (!date) return '—';
  return toBengaliDigits(`${date.getDate()} ${BENGALI_MONTHS[date.getMonth()]} ${date.getFullYear()}`);
}

export function formatDateShort(value: string): string {
  return formatVoucherDate(value);
}

export function formatLongDateBn(date = new Date()): string {
  return `${BENGALI_WEEKDAYS[date.getDay()]}, ${toBengaliDigits(
    `${date.getDate()} ${BENGALI_MONTHS[date.getMonth()]} ${date.getFullYear()}`,
  )}`;
}

export function formatDateTimeBn(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const time = date.toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${toBengaliDigits(
    `${date.getDate()} ${BENGALI_MONTHS[date.getMonth()]} ${date.getFullYear()}`,
  )}, ${time}`;
}

export function currentMonthKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthKeyFromISO(value: string): string {
  return value.slice(0, 7);
}

export function monthLabelBn(key: string): string {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return `${BENGALI_MONTHS[month - 1]} ${toBengaliDigits(year)}`;
}

export function startOfMonthISO(monthKey = currentMonthKey()): string {
  return `${monthKey}-01`;
}

export function endOfMonthISO(monthKey = currentMonthKey()): string {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthKey}-${String(lastDay).padStart(2, '0')}`;
}

export function fileTimestamp(date = new Date()): string {
  return `${toISODate(date)}-${String(date.getHours()).padStart(2, '0')}${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}
