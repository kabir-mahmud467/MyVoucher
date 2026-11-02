import { csvFilename, triggerDownload } from '../db/backupService';
import type { Category, Expense } from '../db/types';

function escapeCsv(value: string): string {
  const escaped = value.replace(/"/g, '""');
  if (/[",\n\r]/.test(escaped)) return `"${escaped}"`;
  return escaped;
}

export function buildExpensesCsv(expenses: Expense[], categories: Category[]): string {
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const header = [
    'তারিখ',
    'খাত',
    'বিবরণ',
    'পরিমাণ',
    'হিসাব পদ্ধতি',
    'একক মূল্য',
    'মোট টাকা (BDT)',
  ];

  const rows = expenses.map((expense) => [
    expense.date,
    categoryMap.get(expense.categoryId) ?? 'অজানা খাত',
    expense.description,
    String(expense.quantity),
    expense.calculationMode === 'automatic' ? 'স্বয়ংক্রিয়' : 'ম্যানুয়াল',
    expense.unitPrice === null ? '' : String(expense.unitPrice),
    String(expense.totalAmount),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
    .join('\r\n');

  // UTF-8 BOM keeps Bengali text readable in Microsoft Excel.
  return `\uFEFF${csv}\r\n`;
}

export function exportExpensesCsv(expenses: Expense[], categories: Category[]): void {
  const csv = buildExpensesCsv(expenses, categories);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, csvFilename());
}
