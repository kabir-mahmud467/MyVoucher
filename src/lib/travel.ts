import type { Category, TravelDetails } from '../db/types';
import { formatNumber } from './format';

export const TRAVEL_MODES = [
  'বাস',
  'রিকশা',
  'সিএনজি',
  'ট্রেন',
  'লঞ্চ',
  'বিমান',
  'মোটরসাইকেল',
  'হেঁটে',
  'অন্যান্য',
] as const;

export interface TravelFormValues {
  from: string;
  to: string;
  mode: string;
  purpose: string;
}

export type TravelFormErrors = Partial<Record<keyof TravelFormValues | 'passengers', string>>;

export function isTravelCategory(category: Category | null | undefined): boolean {
  return category?.kind === 'travel';
}

export function composeTravelDescription(details: TravelDetails): string {
  return [
    `কোথা থেকে: ${details.from}`,
    `কোথায়: ${details.to}`,
    `কতজন: ${formatNumber(details.passengers)} জন`,
    `মাধ্যম: ${details.mode}`,
    `উদ্দেশ্য: ${details.purpose}`,
  ].join('\n');
}

export function travelSummaryLine(details: TravelDetails): string {
  return `${details.from} → ${details.to} · ${formatNumber(details.passengers)} জন · ${details.mode}`;
}

export function validateTravelFields(
  values: TravelFormValues,
  passengers: number,
): { errors: TravelFormErrors; details: TravelDetails | null } {
  const errors: TravelFormErrors = {};
  const from = values.from.trim();
  const to = values.to.trim();
  const mode = values.mode.trim();
  const purpose = values.purpose.trim();

  if (!from) errors.from = 'কোথা থেকে যাত্রা শুরু হয়েছে লিখুন।';
  else if (from.length > 100) errors.from = 'শুরুর স্থান সর্বোচ্চ ১০০ অক্ষরের হতে পারবে।';

  if (!to) errors.to = 'গন্তব্যস্থান লিখুন।';
  else if (to.length > 100) errors.to = 'গন্তব্যস্থান সর্বোচ্চ ১০০ অক্ষরের হতে পারবে।';

  if (!mode) errors.mode = 'যাতায়াতের মাধ্যম নির্বাচন করুন।';

  if (!purpose) errors.purpose = 'যাত্রার উদ্দেশ্য লিখুন।';
  else if (purpose.length > 500) errors.purpose = 'উদ্দেশ্য সর্বোচ্চ ৫০০ অক্ষরের হতে পারবে।';

  if (!Number.isFinite(passengers) || passengers <= 0) {
    errors.passengers = 'কতজন যাত্রী, তা শূন্যের বেশি হতে হবে।';
  }

  if (Object.keys(errors).length > 0) return { errors, details: null };

  return {
    errors,
    details: {
      from,
      to,
      passengers,
      mode,
      purpose,
    },
  };
}
