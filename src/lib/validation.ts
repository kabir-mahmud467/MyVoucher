import type { CalculationMode, ExpenseInput } from '../db/types';
import { isValidISODate } from './dates';
import { parseNumericInput } from './format';

export const MAX_AMOUNT = 999_999_999_999;
export const MAX_QUANTITY = 999_999_999;

export interface ExpenseFormValues {
  date: string;
  categoryId: string;
  description: string;
  calculationMode: CalculationMode;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues | 'form', string>>;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeAutomaticTotal(quantity: number, unitPrice: number): number {
  return roundMoney(quantity * unitPrice);
}

export function validateExpenseForm(values: ExpenseFormValues): {
  errors: ExpenseFormErrors;
  data: ExpenseInput | null;
} {
  const errors: ExpenseFormErrors = {};
  const quantity = parseNumericInput(values.quantity);
  const unitPrice = parseNumericInput(values.unitPrice);
  const manualTotal = parseNumericInput(values.totalAmount);
  const description = values.description.trim();

  if (!isValidISODate(values.date)) {
    errors.date = 'একটি বৈধ তারিখ নির্বাচন করুন।';
  }
  if (!values.categoryId) {
    errors.categoryId = 'একটি খাত নির্বাচন করুন।';
  }
  if (!description) {
    errors.description = 'খরচের বিবরণ লিখুন।';
  } else if (description.length > 1000) {
    errors.description = 'বিবরণ সর্বোচ্চ ১০০০ অক্ষরের হতে পারবে।';
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.quantity = 'পরিমাণ শূন্যের বেশি হতে হবে।';
  } else if (quantity > MAX_QUANTITY) {
    errors.quantity = 'পরিমাণ অত্যন্ত বড়।';
  }

  let totalAmount = manualTotal;
  if (values.calculationMode === 'automatic') {
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      errors.unitPrice = 'একক মূল্য শূন্যের বেশি হতে হবে।';
    } else if (unitPrice > MAX_AMOUNT) {
      errors.unitPrice = 'একক মূল্য অত্যন্ত বড়।';
    }
    if (
      Number.isFinite(quantity) &&
      quantity > 0 &&
      Number.isFinite(unitPrice) &&
      unitPrice > 0
    ) {
      totalAmount = computeAutomaticTotal(quantity, unitPrice);
    }
  } else if (!Number.isFinite(manualTotal) || manualTotal <= 0) {
    errors.totalAmount = 'মোট টাকা শূন্যের বেশি হতে হবে।';
  }

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    errors.totalAmount = errors.totalAmount ?? 'মোট টাকা শূন্যের বেশি হতে হবে।';
  } else if (totalAmount > MAX_AMOUNT) {
    errors.totalAmount = 'মোট টাকা অত্যন্ত বড়।';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, data: null };
  }

  return {
    errors,
    data: {
      date: values.date,
      categoryId: values.categoryId,
      description,
      quantity: Math.round(quantity * 1000) / 1000,
      calculationMode: values.calculationMode,
      unitPrice:
        values.calculationMode === 'automatic'
          ? roundMoney(unitPrice)
          : null,
      totalAmount: roundMoney(totalAmount),
    },
  };
}

export function validateCategoryName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'খাতের নাম লিখুন।';
  if (trimmed.length < 2) return 'খাতের নাম অন্তত ২ অক্ষরের হতে হবে।';
  if (trimmed.length > 60) return 'খাতের নাম সর্বোচ্চ ৬০ অক্ষরের হতে পারবে।';
  return null;
}

export function validateUserName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'আপনার নাম লিখুন।';
  if (trimmed.length < 2) return 'নাম অন্তত ২ অক্ষরের হতে হবে।';
  if (trimmed.length > 80) return 'নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারবে।';
  return null;
}
