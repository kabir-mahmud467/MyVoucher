import { createId } from '../lib/id';
import { roundMoney, computeAutomaticTotal } from '../lib/validation';
import { db } from './database';
import type { Expense, ExpenseInput } from './types';

function assertCategoryExists(categoryId: string): Promise<void> {
  return db.categories.get(categoryId).then((category) => {
    if (!category) throw new Error('নির্বাচিত খাতটি পাওয়া যায়নি।');
  });
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  return db.transaction('rw', db.categories, db.expenses, async () => {
    await assertCategoryExists(input.categoryId);
    if (input.calculationMode === 'automatic') {
      if (!input.unitPrice || input.unitPrice <= 0) {
        throw new Error('স্বয়ংক্রিয় হিসাবের জন্য একক মূল্য দিন।');
      }
    }
    const now = new Date().toISOString();
    const expense: Expense = {
      ...input,
      id: createId(),
      description: input.description.trim(),
      totalAmount:
        input.calculationMode === 'automatic' && input.unitPrice !== null
          ? computeAutomaticTotal(input.quantity, input.unitPrice)
          : roundMoney(input.totalAmount),
      unitPrice: input.calculationMode === 'automatic' ? input.unitPrice : null,
      ...(input.travelDetails ? { travelDetails: input.travelDetails } : {}),
      createdAt: now,
      updatedAt: now,
    };
    await db.expenses.add(expense);
    return expense;
  });
}

export async function updateExpense(
  expenseId: string,
  input: ExpenseInput,
): Promise<void> {
  await db.transaction('rw', db.categories, db.expenses, async () => {
    await assertCategoryExists(input.categoryId);
    const existing = await db.expenses.get(expenseId);
    if (!existing) throw new Error('খরচের রেকর্ডটি পাওয়া যায়নি।');
    if (input.calculationMode === 'automatic') {
      if (!input.unitPrice || input.unitPrice <= 0) {
        throw new Error('স্বয়ংক্রিয় হিসাবের জন্য একক মূল্য দিন।');
      }
    }
    await db.expenses.update(expenseId, {
      date: input.date,
      categoryId: input.categoryId,
      description: input.description.trim(),
      quantity: input.quantity,
      calculationMode: input.calculationMode,
      unitPrice: input.calculationMode === 'automatic' ? input.unitPrice : null,
      travelDetails: input.travelDetails ?? null,
      totalAmount:
        input.calculationMode === 'automatic' && input.unitPrice !== null
          ? computeAutomaticTotal(input.quantity, input.unitPrice)
          : roundMoney(input.totalAmount),
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function patchExpense(
  expenseId: string,
  patch: Partial<
    Pick<
      Expense,
      | 'date'
      | 'categoryId'
      | 'description'
      | 'quantity'
      | 'calculationMode'
      | 'unitPrice'
      | 'totalAmount'
      | 'travelDetails'
    >
  >,
): Promise<void> {
  await db.transaction('rw', db.categories, db.expenses, async () => {
    const existing = await db.expenses.get(expenseId);
    if (!existing) throw new Error('খরচের রেকর্ডটি পাওয়া যায়নি।');
    if (patch.categoryId) await assertCategoryExists(patch.categoryId);
    const now = new Date().toISOString();
    await db.expenses.update(expenseId, {
      ...patch,
      updatedAt: now,
    });
  });
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await db.expenses.delete(expenseId);
}

export async function deleteAllExpenses(): Promise<void> {
  await db.expenses.clear();
}
