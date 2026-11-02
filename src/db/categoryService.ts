import { createId } from '../lib/id';
import { validateCategoryName } from '../lib/validation';
import { db } from './database';
import type { Category } from './types';

export async function createCategory(name: string): Promise<Category> {
  const validationError = validateCategoryName(name);
  if (validationError) throw new Error(validationError);

  const trimmed = name.trim();
  return db.transaction('rw', db.categories, async () => {
    const duplicate = await db.categories
      .filter((category) => category.name.trim().toLocaleLowerCase('bn') === trimmed.toLocaleLowerCase('bn'))
      .first();
    if (duplicate) {
      throw new Error(duplicate.archived ? 'এই নামে একটি সংরক্ষিত খাত আছে।' : 'এই নামে একটি খাত ইতিমধ্যে আছে।');
    }
    const now = new Date().toISOString();
    const category: Category = {
      id: createId(),
      name: trimmed,
      kind: trimmed === 'যাতায়াত' ? 'travel' : 'general',
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.categories.add(category);
    return category;
  });
}

export async function renameCategory(categoryId: string, name: string): Promise<void> {
  const validationError = validateCategoryName(name);
  if (validationError) throw new Error(validationError);

  const trimmed = name.trim();
  await db.transaction('rw', db.categories, async () => {
    const category = await db.categories.get(categoryId);
    if (!category) throw new Error('খাতটি পাওয়া যায়নি।');
    const duplicate = await db.categories
      .filter(
        (item) =>
          item.id !== categoryId &&
          item.name.trim().toLocaleLowerCase('bn') === trimmed.toLocaleLowerCase('bn'),
      )
      .first();
    if (duplicate) throw new Error('এই নামে অন্যএকটি খাত আছে।');
    await db.categories.update(categoryId, {
      name: trimmed,
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function setCategoryArchived(
  categoryId: string,
  archived: boolean,
): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const category = await db.categories.get(categoryId);
    if (!category) throw new Error('খাতটি পাওয়া যায়নি।');
    await db.categories.update(categoryId, {
      archived,
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function deleteCategory(
  categoryId: string,
  reassignToCategoryId?: string | null,
): Promise<{ movedExpenses: number }> {
  return db.transaction('rw', db.categories, db.expenses, async () => {
    const category = await db.categories.get(categoryId);
    if (!category) throw new Error('খাতটি পাওয়া যায়নি।');

    const usageCount = await db.expenses.where('categoryId').equals(categoryId).count();
    let movedExpenses = 0;

    if (usageCount > 0) {
      if (!reassignToCategoryId) {
        throw new Error('এই খাতে খরচ রয়েছে। খরচগুলো অন্য খাতে সরান অথবা খাতটি সংরক্ষণ করুন।');
      }
      if (reassignToCategoryId === categoryId) {
        throw new Error('একই খাতে খরচ সরানো যাবে না।');
      }
      const target = await db.categories.get(reassignToCategoryId);
      if (!target) throw new Error('নতুন খাতটি পাওয়া যায়নি।');
      const now = new Date().toISOString();
      await db.expenses.where('categoryId').equals(categoryId).modify((expense) => {
        expense.categoryId = reassignToCategoryId;
        expense.updatedAt = now;
      });
      movedExpenses = usageCount;
    }

    await db.categories.delete(categoryId);
    return { movedExpenses };
  });
}
