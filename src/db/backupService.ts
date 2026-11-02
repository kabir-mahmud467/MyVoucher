import { fileTimestamp, isValidISODate, todayISO } from '../lib/dates';
import { APP_VERSION } from '../lib/constants';
import { db, getDatabaseVersion } from './database';
import type {
  BackupPayload,
  BackupSummary,
  Category,
  Expense,
  Metadata,
  Setting,
  User,
} from './types';

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

export async function createBackupPayload(): Promise<BackupPayload> {
  const [users, expenses, categories, settings, metadata, databaseVersion] = await Promise.all([
    db.users.toArray(),
    db.expenses.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
    db.metadata.toArray(),
    getDatabaseVersion(),
  ]);

  return {
    app: 'MyVoucher',
    appVersion: APP_VERSION,
    databaseName: 'MyVoucherDB',
    databaseVersion,
    exportedAt: new Date().toISOString(),
    data: { users, expenses, categories, settings, metadata },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function assertTimestamp(value: unknown, label: string): asserts value is string {
  if (!isNonEmptyString(value) || Number.isNaN(Date.parse(value))) {
    throw new BackupValidationError(`${label} সঠিক টাইমস্ট্যাম্প নয়।`);
  }
}

function uniqueIds(items: { id: string }[], label: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new BackupValidationError(`${label}-এ একই আইডি একাধিকবার আছে।`);
    }
    ids.add(item.id);
  }
}

export function validateBackup(raw: unknown): BackupPayload {
  if (!isRecord(raw)) throw new BackupValidationError('ফাইলটি একটি বৈধ MyVoucher ব্যাকআপ নয়।');
  if (raw.app !== 'MyVoucher') {
    throw new BackupValidationError('ব্যাকআপ ফাইলটি MyVoucher অ্যাপের নয়।');
  }
  if (raw.databaseName !== 'MyVoucherDB') {
    throw new BackupValidationError('ব্যাকআপের ডেটাবেজ শনাক্ত করা যায়নি।');
  }
  assertTimestamp(raw.exportedAt, 'ব্যাকআপের তারিখ');
  if (!isRecord(raw.data)) throw new BackupValidationError('ব্যাকআপে কোনো ডেটা পাওয়া যায়নি।');

  const { users, expenses, categories, settings, metadata } = raw.data;
  if (!Array.isArray(users) || !Array.isArray(expenses) || !Array.isArray(categories)) {
    throw new BackupValidationError('ব্যাকআপের মূল ডেটা অসম্পূর্ণ।');
  }
  if (!Array.isArray(settings) || !Array.isArray(metadata)) {
    throw new BackupValidationError('ব্যাকআপের সেটিংস বা মেটাডেটা অসম্পূর্ণ।');
  }
  if (users.length !== 1) {
    throw new BackupValidationError('ব্যাকআপে ঠিক একজন ব্যবহারকারীর প্রোফাইল থাকতে হবে।');
  }
  if (expenses.length > 500_000) {
    throw new BackupValidationError('ব্যাকআপে অতিরিক্ত সংখ্যক রেকর্ড রয়েছে।');
  }

  const parsedUsers: User[] = users.map((value, index) => {
    if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.name)) {
      throw new BackupValidationError(`ব্যবহারকারীর তথ্য (${index + 1}) সঠিক নয়।`);
    }
    assertTimestamp(value.createdAt, 'ব্যবহারকারীর তৈরি হওয়ার সময়');
    assertTimestamp(value.updatedAt, 'ব্যবহারকারীর হালনাগাদের সময়');
    return {
      id: value.id,
      name: value.name.trim(),
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  });

  const parsedCategories: Category[] = categories.map((value, index) => {
    if (
      !isRecord(value) ||
      !isNonEmptyString(value.id) ||
      !isNonEmptyString(value.name) ||
      typeof value.archived !== 'boolean'
    ) {
      throw new BackupValidationError(`খাতের তথ্য (${index + 1}) সঠিক নয়।`);
    }
    assertTimestamp(value.createdAt, 'খাতের তৈরি হওয়ার সময়');
    assertTimestamp(value.updatedAt, 'খাতের হালনাগাদের সময়');
    const kind =
      value.kind === 'travel'
        ? 'travel'
        : value.kind === 'general'
          ? 'general'
          : value.name.trim() === 'যাতায়াত'
            ? 'travel'
            : 'general';
    return {
      id: value.id,
      name: value.name.trim(),
      kind,
      archived: value.archived,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  });

  uniqueIds(parsedUsers, 'ব্যবহারকারী');
  uniqueIds(parsedCategories, 'খাত');
  const categoryIds = new Set(parsedCategories.map((category) => category.id));
  const categoryNames = new Set<string>();
  for (const category of parsedCategories) {
    const normalized = category.name.toLocaleLowerCase('bn');
    if (categoryNames.has(normalized)) {
      throw new BackupValidationError(`একই নামে একাধিক খাত আছে: ${category.name}`);
    }
    categoryNames.add(normalized);
  }

  const parsedExpenses: Expense[] = expenses.map((value, index) => {
    if (
      !isRecord(value) ||
      !isNonEmptyString(value.id) ||
      !isNonEmptyString(value.date) ||
      !isValidISODate(value.date) ||
      !isNonEmptyString(value.categoryId) ||
      !isNonEmptyString(value.description) ||
      !isFiniteNumber(value.quantity) ||
      value.quantity <= 0 ||
      !isFiniteNumber(value.totalAmount) ||
      value.totalAmount < 0
    ) {
      throw new BackupValidationError(`খরচের তথ্য (${index + 1}) সঠিক নয়।`);
    }
    if (value.calculationMode !== 'manual' && value.calculationMode !== 'automatic') {
      throw new BackupValidationError(`খরচের হিসাব পদ্ধতি (${index + 1}) সঠিক নয়।`);
    }
    if (
      value.unitPrice !== null &&
      (!isFiniteNumber(value.unitPrice) || value.unitPrice < 0)
    ) {
      throw new BackupValidationError(`একক মূল্য (${index + 1}) সঠিক নয়।`);
    }
    if (!categoryIds.has(value.categoryId)) {
      throw new BackupValidationError(`খরচের খাত (${index + 1}) ব্যাকআপে নেই।`);
    }
    let travelDetails: Expense['travelDetails'] = null;
    if (value.travelDetails !== undefined && value.travelDetails !== null) {
      const details = value.travelDetails;
      if (
        !isRecord(details) ||
        !isNonEmptyString(details.from) ||
        !isNonEmptyString(details.to) ||
        !isNonEmptyString(details.mode) ||
        !isNonEmptyString(details.purpose) ||
        !isFiniteNumber(details.passengers) ||
        details.passengers <= 0
      ) {
        throw new BackupValidationError(`যাতায়াতের তথ্য (${index + 1}) সঠিক নয়।`);
      }
      travelDetails = {
        from: details.from,
        to: details.to,
        passengers: details.passengers,
        mode: details.mode,
        purpose: details.purpose,
      };
    }
    assertTimestamp(value.createdAt, 'খরচের তৈরি হওয়ার সময়');
    assertTimestamp(value.updatedAt, 'খরচের হালনাগাদের সময়');
    return {
      id: value.id,
      date: value.date,
      categoryId: value.categoryId,
      description: value.description,
      quantity: value.quantity,
      calculationMode: value.calculationMode,
      unitPrice: value.unitPrice as number | null,
      totalAmount: value.totalAmount,
      travelDetails,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  });
  uniqueIds(parsedExpenses, 'খরচ');

  const parsedSettings: Setting[] = settings.map((value, index) => {
    if (
      !isRecord(value) ||
      !isNonEmptyString(value.id) ||
      !isNonEmptyString(value.key) ||
      typeof value.value !== 'string'
    ) {
      throw new BackupValidationError(`সেটিংস (${index + 1}) সঠিক নয়।`);
    }
    return { id: value.id, key: value.key, value: value.value };
  });
  uniqueIds(parsedSettings, 'সেটিংস');

  const parsedMetadata: Metadata[] = metadata.map((value, index) => {
    if (
      !isRecord(value) ||
      !isNonEmptyString(value.id) ||
      !isNonEmptyString(value.key) ||
      typeof value.value !== 'string'
    ) {
      throw new BackupValidationError(`মেটাডেটা (${index + 1}) সঠিক নয়।`);
    }
    return { id: value.id, key: value.key, value: value.value };
  });
  uniqueIds(parsedMetadata, 'মেটাডেটা');

  return {
    app: 'MyVoucher',
    appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : 'অজানা',
    databaseName: 'MyVoucherDB',
    databaseVersion:
      typeof raw.databaseVersion === 'number' && Number.isFinite(raw.databaseVersion)
        ? raw.databaseVersion
        : 1,
    exportedAt: raw.exportedAt,
    data: {
      users: parsedUsers,
      expenses: parsedExpenses,
      categories: parsedCategories,
      settings: parsedSettings,
      metadata: parsedMetadata,
    },
  };
}

export function summarizeBackup(backup: BackupPayload): BackupSummary {
  return {
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
    databaseVersion: backup.databaseVersion,
    userCount: backup.data.users.length,
    expenseCount: backup.data.expenses.length,
    categoryCount: backup.data.categories.length,
  };
}

export async function restoreBackup(
  backup: BackupPayload,
  mode: 'merge' | 'replace',
): Promise<void> {
  const validated = validateBackup(backup);

  await db.transaction(
    'rw',
    [db.users, db.expenses, db.categories, db.settings, db.metadata],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.users.clear(),
          db.expenses.clear(),
          db.categories.clear(),
          db.settings.clear(),
          db.metadata.clear(),
        ]);
      }

      await db.categories.bulkPut(validated.data.categories);
      await db.expenses.bulkPut(validated.data.expenses);
      await db.settings.bulkPut(validated.data.settings);
      await db.metadata.bulkPut(validated.data.metadata);

      if (mode === 'replace') {
        await db.users.bulkPut(validated.data.users);
      } else {
        const currentUser = await db.users.orderBy('createdAt').first();
        if (!currentUser) {
          await db.users.bulkPut(validated.data.users);
        }
      }
    },
  );
}

export function backupFilename(exportedAt: string): string {
  const date = new Date(exportedAt);
  return `MyVoucher-Backup-${fileTimestamp(date)}.json`;
}

export function downloadJson(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  triggerDownload(blob, filename);
}

export function csvFilename(): string {
  return `MyVoucher-Expenses-${todayISO()}.csv`;
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
