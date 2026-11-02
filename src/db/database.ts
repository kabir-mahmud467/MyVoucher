import Dexie, { type Table } from 'dexie';
import type { Category, Expense, Metadata, Setting, User } from './types';

export const DB_NAME = 'MyVoucherDB';

export class MyVoucherDB extends Dexie {
  users!: Table<User, string>;
  expenses!: Table<Expense, string>;
  categories!: Table<Category, string>;
  settings!: Table<Setting, string>;
  metadata!: Table<Metadata, string>;

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      users: 'id, createdAt',
      expenses: 'id, date, categoryId, createdAt, updatedAt',
      categories: 'id, name, archived, createdAt',
      settings: 'id, key',
      metadata: 'id, key',
    });

    // Version 2 indexes calculation mode and adds compound lookup support.
    // Existing v1 rows receive explicit defaults without touching user data.
    this.version(2)
      .stores({
        users: 'id, createdAt',
        expenses:
          'id, date, categoryId, calculationMode, createdAt, updatedAt, [categoryId+date]',
        categories: 'id, &name, archived, createdAt',
        settings: 'id, &key',
        metadata: 'id, &key',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<Expense>('expenses')
          .toCollection()
          .modify((expense) => {
            if (expense.calculationMode !== 'manual' && expense.calculationMode !== 'automatic') {
              expense.calculationMode = 'manual';
            }
            if (typeof expense.unitPrice !== 'number' || !Number.isFinite(expense.unitPrice)) {
              expense.unitPrice = null;
            }
            if (typeof expense.quantity !== 'number' || !Number.isFinite(expense.quantity)) {
              expense.quantity = 1;
            }
            if (typeof expense.totalAmount !== 'number' || !Number.isFinite(expense.totalAmount)) {
              expense.totalAmount = 0;
            }
          });
      });

    // Version 3 adds category kinds and structured travel expense details.
    this.version(3)
      .stores({
        users: 'id, createdAt',
        expenses:
          'id, date, categoryId, calculationMode, createdAt, updatedAt, [categoryId+date]',
        categories: 'id, &name, archived, createdAt',
        settings: 'id, &key',
        metadata: 'id, &key',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<Category>('categories')
          .toCollection()
          .modify((category) => {
            if (!category.kind) {
              category.kind = category.name.trim() === 'যাতায়াত' ? 'travel' : 'general';
            }
          });
      });
  }
}

export const db = new MyVoucherDB();

const DEFAULT_CATEGORIES = ['যাতায়াত', 'আপ্যায়ন', 'HRD'] as const;

let initialization: Promise<void> | null = null;

export async function initializeDatabase(): Promise<void> {
  if (initialization) return initialization;

  initialization = db.transaction(
    'rw',
    db.metadata,
    db.categories,
    db.settings,
    async () => {
      const initialized = await db.metadata.get('appInitialized');

      if (!initialized) {
        const categoryCount = await db.categories.count();
        if (categoryCount === 0) {
          const now = new Date().toISOString();
          await db.categories.bulkAdd(
            DEFAULT_CATEGORIES.map((name) => ({
              id: crypto.randomUUID(),
              name,
              kind: name === 'যাতায়াত' ? ('travel' as const) : ('general' as const),
              archived: false,
              createdAt: now,
              updatedAt: now,
            })),
          );
        }
        await db.metadata.put({
          id: 'appInitialized',
          key: 'appInitialized',
          value: new Date().toISOString(),
        });
      }

      const theme = await db.settings.get('theme');
      if (!theme) {
        await db.settings.put({ id: 'theme', key: 'theme', value: 'light' });
      }
    },
  );

  try {
    await initialization;
  } catch (error) {
    initialization = null;
    throw error;
  }
}

export async function getDatabaseVersion(): Promise<number> {
  return db.verno;
}
